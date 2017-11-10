import {
  Rubric,
  CategoryScore,
  Question,
  SetComponentPropertyAction,
  Assignment,
} from '../../typings/index.d';
import {
  createUUID,
  fireLocalAction,
  navigate,
} from '../../node_modules/prendus-shared/services/utilities-service';
import {shuffleArray} from '../../services/utilities-service'; //TODO: Move into prendus-shared when Jordan is back
import {sendStatement} from '../../services/analytics-service';
import {GQLRequest} from '../../node_modules/prendus-shared/services/graphql-service';
import {extractVariables} from '../../services/code-to-question-service';
import {
  NotificationType,
  QuestionType,
  ContextType,
  VerbType,
  ObjectType
} from '../../services/constants-service';
import {
  setNotification,
} from '../../redux/actions';
import {LTIPassback} from '../../services/lti-service';
import {DEFAULT_EVALUATION_RUBRIC} from '../../services/constants-service';

class PrendusReviewAssignment extends Polymer.Element {
  action: SetComponentPropertyAction;
  user: User;
  userToken: string;
  assignmentId: string;
  assignment: Assignment;
  question: Question;
  questions: Question[];
  ratings: CategoryScore[];
  rubric: Rubric;
  loaded: boolean = false;
  essayType: boolean;
  gradingRubric: Rubric;
  completionReason: string;
  modalOpen: boolean;

  static get is() { return 'prendus-review-assignment' }

  static get properties() {
    return {
      assignmentId: String,
      essayType: {
        type: Boolean,
        value: false,
        computed: '_computeEssayType(assignment)'
      },
      gradingRubric: {
        type: Object,
        computed: '_computeGradingRubric(question)'
      },
      evaluationRubric: {
        type: Object,
        value: {},
        computed: '_computeEvaluationRubric(question)'
      },
      completionReason: {
        type: String,
        computed: '_computeCompletionReason(assignment)'
      },
      questions: {
        type: Array,
        computed: '_computeQuestions(assignment)'
      }
    }
  }

  constructor() {
    super();
    this.componentId = createUUID();
  }

  _computeEssayType(assignment: Assignment): boolean {
    return assignment && assignment.questionType === QuestionType.ESSAY;
  }

  _computeGradingRubric(question: Question): Rubric | null {
    if (!question || !question.code) return null;
    return parseRubric(question.code, 'gradingRubric');
  }

  _computeEvaluationRubric(question: Question): Rubric | null {
    if (!question || !question.code) return null;
    return parseRubric(question.code, 'evaluationRubric');
  }

  _computeCompletionReason(assignment: Assignment): string {
    return assignment && assignment.questions.length >= assignment.numReviewQuestions
      ? 'You have completed this assignment'
      : 'There are not enough questions to take the assignment yet';
  }

  _handleUnauthorized(e: CustomEvent) {
    const { authenticated, payed, enrolled, courseId } = e.detail;
    if (authenticated === false)
      navigate('/authenticate');
    else if (payed === false)
      navigate(`/course/${courseId}/payment?redirectUrl=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`);
    else if (enrolled === false)
      this.action = fireLocalAction(this.componentId, 'modalOpen', true);
  }

  async _loadAssignment(e: CustomEvent) {
    this.action = fireLocalAction(this.componentId, 'loaded', false);
    const assignment = await loadAssignment(this.assignmentId, this.user.id, this.userToken, this._handleGQLError.bind(this));
    if (assignment.rated.length)
      this.action = setNotification('You have already completed this assignment', NotificationType.WARNING);
    this.action = fireLocalAction(this.componentId, 'assignment', assignment);
    this.action = fireLocalAction(this.componentId, 'loaded', true);
    this.dispatchEvent(new CustomEvent('assignment-loaded'));
  }

  _computeQuestions(assignment: Assignment): Question[] {
    return assignment && assignment.questions.length >= assignment.numReviewQuestions
      ? randomWithUnreviewedFirst(assignment.questions, assignment.numReviewQuestions)
      : [];
  }

  _handleGQLError(err: any) {
    this.action = setNotification(err.message, NotificationType.ERROR);
  }

  async _handleNextRequest(e: CustomEvent) {
    this.action = fireLocalAction(this.componentId, 'loaded', false);
    try {
      validate(this.evaluationRubric, this.ratings);
      await submit(this.question.id, this.user.id, this.ratings, this.userToken, this._handleGQLError.bind(this));
      this.shadowRoot.querySelector('#carousel').next();
    } catch (err) {
      this.action = setNotification(err.message, NotificationType.ERROR);
    }
    this.action = fireLocalAction(this.componentId, 'loaded', true);
  }

  _handleNextQuestion(e: CustomEvent) {
    const question = e.detail.value;
    const statement = { userId: this.user.id, assignmentId: this.assignment.id, courseId: this.assignment.course.id };
    if (question && question === this.questions[0])
      sendStatement(this.userToken, { ...statement, verb: VerbType.STARTED });
    else
      sendStatement(this.userToken, { ...statement, verb: VerbType.REVIEWED, questionId: this.question.id });
    this.action = fireLocalAction(this.componentId, 'question', question);
  }

  _handleFinished(e: CustomEvent) {
    const finished = e.detail.value;
    this.action = fireLocalAction(this.componentId, 'finished', finished);
    if (!finished)
      return;
    if (this.questions && this.questions.length)
      this.gradePassback();
  }

  async gradePassback() {
    try {
      await LTIPassback(this.userToken, this.user.id, this.assignment.id, this.assignment.course.id, getCookie('ltiSessionIdJWT'));
      this.action = setNotification('Grade passback succeeded.', NotificationType.SUCCESS);
    }
    catch(error) {
      this.action = setNotification('Grade passback failed. Retrying...', NotificationType.ERROR);
      setTimeout(() => {
          this.gradePassback();
      }, 5000);
    }
  }

  _handleRatings(e: CustomEvent) {
    this._fireLocalAction('ratings', e.detail.scores);
  }

  _parseRubric(code: string, varName: string): Rubric {
    if (!code) return {};
    const { evaluationRubric, gradingRubric } = extractVariables(code);
    if (varName === 'evaluationRubric' && evaluationRubric)
      return JSON.parse(evaluationRubric.value);
    else if (varName === 'evaluationRubric')
      return DEFAULT_EVALUATION_RUBRIC;
    else if (varName === 'gradingRubric' && gradingRubric)
      return JSON.parse(gradingRubric.value);
    else return {};
  }

  async _submit(question: Question, ratings: CategoryScore[]) {
    const query = `mutation rateQuestion($questionId: ID!, $ratings: [QuestionRatingscoresCategoryScore!]!, $raterId: ID!) {
      createQuestionRating (
        raterId: $raterId
        questionId: $questionId
        scores: $ratings
      ) {
        id
      }
    }`;
    const variables = {
      questionId: question.id,
      ratings,
      raterId: this.user.id
    };
    await GQLRequest(query, variables, this.userToken, this._handleGQLError.bind(this));
>>>>>>> tech-transfer-staging
  }

  _handleRatings(e: CustomEvent) {
    this.action = fireLocalAction(this.componentId, 'ratings', e.detail.value);
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    this.loaded = componentState.loaded;
    this.assignment = componentState.assignment;
    this.question = componentState.question;
    this.ratings = componentState.ratings;
    this.finished = componentState.finished;
    this.modalOpen = componentState.modalOpen;
    this.user = state.user;
    this.userToken = state.userToken;
  }

}

async function loadAssignment(assignmentId: string, userId: string, userToken: string, cb: (err: any) => void): Assignment | null {
  const data = await GQLRequest(`query getAssignment($assignmentId: ID!, $userId: ID!) {
    Assignment(id: $assignmentId) {
      id
      title
      questionType
      numReviewQuestions
      questions(filter: {
        author: {
          id: $userId
        }
      }) {
        id
        course {
          id
        }
        text
        code
        explanation
        concept {
          title
        }
        resource
        answerComments {
          text
        }
        _ratingsMeta {
          count
        }
      }
      rated: questions(filter: {
        ratings_some: {
          rater: {
            id: $userId
          }
        }
      }) {
        id
      }
    }
  }`, {assignmentId, userId}, userToken, cb);
  if (!data) {
    return null;
  }
  return data.Assignment;
}

function submit(questionId: string, raterId: string, ratings: CategoryScore[], userToken: string, cb: (err: any) => void) {
  const query = `mutation rateQuestion($questionId: ID!, $ratings: [QuestionRatingscoresCategoryScore!]!, $raterId: ID!) {
    createQuestionRating (
      raterId: $raterId
      questionId: $questionId
      scores: $ratings
    ) {
      id
    }
  }`;
  const variables = {
    questionId,
    ratings,
    raterId
  };
  return GQLRequest(query, variables, userToken, cb);
}

function parseRubric(code: string, varName: string): Rubric {
  if (!code) return {};
  const { evaluationRubric, gradingRubric } = extractVariables(code);
  if (varName === 'evaluationRubric' && evaluationRubric)
    return JSON.parse(evaluationRubric.value);
  else if (varName === 'evaluationRubric')
    return DEFAULT_EVALUATION_RUBRIC;
  else if (varName === 'gradingRubric' && gradingRubric)
    return JSON.parse(gradingRubric.value);
  else return {};
}

function randomWithUnreviewedFirst(questions: Question[], num: number): Question[] {
  const unreviewed = questions.filter(question => !question._ratingsMeta.count);
  if (unreviewed.length >= num)
    return shuffleArray(unreviewed).slice(0, num);
  else if (!unreviewed.length)
    return shuffleArray(questions).slice(0, num);
  const reviewed = questions.filter(question => question._ratingsMeta.count);
  return [...shuffleArray(unreviewed), ...shuffleArray(reviewed).slice(0, num-unreviewed.length)];
}

function validate(rubric: Rubric, ratings: CategoryScore[]) {
  if (ratings.some(score => score.score < 0))
    throw new Error('You must rate each category');
}

window.customElements.define(PrendusReviewAssignment.is, PrendusReviewAssignment)
