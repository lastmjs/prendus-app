import {
  Rubric,
  CategoryScore,
  Question,
  SetComponentPropertyAction,
  SetPropertyAction,
  Assignment,
  AssignmentFunctions,
  AssignmentFunctionsLoadResult,
} from '../../prendus.d';
import {
  createUUID,
  fireLocalAction,
} from '../../node_modules/prendus-shared/services/utilities-service';
import {
  shuffleArray
} from '../../services/utilities-service'; //TODO: Move into prendus-shared when Jordan is back
import {
  GQLRequest
} from '../../node_modules/prendus-shared/services/graphql-service';
import {
  extractVariables
} from '../../services/code-to-question-service';
import {
  NotificationType,
  QuestionType,
  DEFAULT_EVALUATION_RUBRIC
} from '../../services/constants-service';
import {
  setNotification,
} from '../../redux/actions';

class PrendusReviewAssignment extends Polymer.Element implements AssignmentFunctions {
  action: SetComponentPropertyAction;
  user: User;
  userToken: string;
  assignmentId: string;
  assignment: Assignment;
  functions: AssignmentFunctions;
  question: Question;
  ratings: CategoryScore[];
  essayType: boolean;
  evaluationRubric: Rubric;
  gradingRubric: Rubric;

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
    }
  }

  constructor() {
    super();
    this.componentId = createUUID();
  }

  connectedCallback() {
    super.connectedCallback();
    this.action = fireLocalAction(this.componentId, 'functions', this);
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

  async loadItems(assignmentId: string): Promise<AssignmentFunctionsLoadResult> {
    const assignment = await loadAssignment(assignmentId, this.user.id, this.userToken, this._handleGQLError.bind(this));
    this.action = fireLocalAction(this.componentId, 'assignment', assignment);
    const questions = assignment && assignment.questions.length >= assignment.numReviewQuestions
      ? randomWithUnreviewedFirst(assignment.questions, assignment.numReviewQuestions)
      : [];
    return {
      title: assignment.title + ' Review Assignment',
      items: questions,
      taken: assignment.rated.length > 0
    }
  }

  error(): string | null {
    if (!this.ratings || !this.evaluationRubric)
      return 'Prendus error, ratings or rubric was undefined';
    if (this.ratings.length !== Object.keys(this.evaluationRubric).length)
      return 'Prendus error, ratings did not match rubric';
    if (this.ratings.some(score => score.score < 0))
      return 'You must rate each category';
    return null;
  }

  async submitItem(question: Question): Promise<string> {
    await submit(question.id, this.user.id, this.ratings, this.userToken, this._handleGQLError.bind(this));
    return question.id;
  }

  _question(e: CustomEvent) {
    this.action = fireLocalAction(this.componentId, 'question', e.detail.value);
  }

  _ratings(e: CustomEvent) {
    this.action = fireLocalAction(this.componentId, 'ratings', e.detail.value);
  }

  _handleGQLError(err: any) {
    this.action = setNotification(err.message, NotificationType.ERROR);
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    this.assignment = componentState.assignment;
    this.functions = componentState.functions;
    this.question = componentState.question;
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

window.customElements.define(PrendusReviewAssignment.is, PrendusReviewAssignment)
