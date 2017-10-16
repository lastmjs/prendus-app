import {
  Rubric,
  CategoryScore,
  Question,
  SetComponentPropertyAction,
  Assignment,
} from '../../typings/index.d';
import {
  createUUID,
  fireLocalAction
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
  getAndSetUser,
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

  static get is() { return 'prendus-review-assignment' }

  static get properties() {
    return {
      assignmentId: String,
      _essayType: {
        type: Boolean,
        value: false,
        computed: '_computeEssayType(assignment)'
      },
      _gradingRubric: {
        type: Object,
        computed: '_computeGradingRubric(question)'
      },
      _completionReason: {
        type: String,
        computed: '_computeCompletionReason(assignment, questions)'
      },
      questions: {
        type: Array,
        computed: '_computeQuestions(assignment)'
      }
    }
  }

  static get observers() {
    return [
      '_computeAssignment(assignmentId, user, userToken)'
    ]
  }

  constructor() {
    super();
    this.componentId = createUUID();
  }

  _computeEssayType(assignment: Assignment): boolean {
    return assignment && assignment.questionType === QuestionType.ESSAY;
  }

  _computeGradingRubric(question: Question): Rubric {
    if (!question || !question.code) return null;
    return parseRubric(question.code, 'gradingRubric');
  }

  _computeCompletionReason(assignment: Assignment, questions: Question[]): string {
    return questions && questions.length > assignment.numReviewQuestions
      ? 'You have completed this assignment'
      : 'There are not enough questions to take the assignment yet';
  }

  async _computeAssignment(assignmentId: string, user: User, userToken: string) {
    if (!assignmentId || !user || !userToken) return;
    this.action = fireLocalAction(this.componentId, 'loaded', false);
    const assignment = await loadAssignment(assignmentId, user.id, userToken, this._handleGQLError.bind(this));
    this.action = fireLocalAction(this.componentId, 'assignment', assignment);
    this.action = fireLocalAction(this.componentId, 'loaded', true);
  }

  _computeQuestions(assignment: Assignment): Question[] {
    return assignment && assignment.questions.length > assignment.numReviewQuestions
      ? randomWithUnreviewedFirst(assignment.questions, assignment.numReviewQuestions)
      : [];
  }

  _handleGQLError(err: any) {
    this.action = setNotification(err.message, NotificationType.ERROR);
  }

  async _handleNextRequest(e: CustomEvent) {
    this.action = fireLocalAction(this.componentId, 'loaded', false);
    try {
      validate(this.rubric, this.ratings);
      await submit(this.question.id, this.user.id, this.ratings, this.userToken, this._handleGQLError.bind(this));
      this.shadowRoot.querySelector('#carousel').nextData();
    } catch (err) {
      this.action = setNotification(err.message, NotificationType.ERROR);
    }
    this.action = fireLocalAction(this.componentId, 'loaded', true);
  }

  _handleNextQuestion(e: CustomEvent) {
    const { data } = e.detail;
    this.action = fireLocalAction(this.componentId, 'question', data);
    if (data && data === this.questions[0])
      sendStatement(this.userToken, this.user.id, this.assignment.id, ContextType.ASSIGNMENT, VerbType.STARTED, ObjectType.REVIEW);
    else
      sendStatement(this.userToken, this.user.id, this.assignment.id, ContextType.ASSIGNMENT, VerbType.REVIEWED, ObjectType.REVIEW);
    if (data) {
      this.action = fireLocalAction(this.componentId, 'rubric', null); //to clear rubric dropdown selections
      setTimeout(() => {
        this.action = fireLocalAction(this.componentId, 'rubric', parseRubric(data.code, 'evaluationRubric'));
      });
    } else if (this.questions.length) {
      LTIPassback(this.userToken, this.user.id, this.assignment.id, ObjectType.REVIEW);
    }
  }

  _handleRatings(e: CustomEvent) {
    this.action = fireLocalAction(this.componentId, 'ratings', e.detail.scores);
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    this.loaded = componentState.loaded;
    this.assignment = componentState.assignment;
    this.question = componentState.question;
    this.rubric = componentState.rubric;
    this.ratings = componentState.ratings;
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
          id_not: $userId
        }
      }) {
        id
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
  if (!ratings) throw new Error('You must rate the question');
  if (ratings.length !== Object.keys(rubric).length) throw new Error('You must rate each category');
  if (ratings.some(score => !rubric.hasOwnProperty(score.category) || score.score < 0))
    throw new Error('You must rate each category');
}

window.customElements.define(PrendusReviewAssignment.is, PrendusReviewAssignment)
