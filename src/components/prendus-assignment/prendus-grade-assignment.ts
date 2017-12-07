import {
  SetComponentPropertyAction,
  User,
  UserEssay,
  Rubric,
  Assignment,
  AnalyticsAssignment,
  AnalyticsAssignmentLoadResult
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
  QuestionType,
  NotificationType,
} from '../../services/constants-service';
import {
  setNotification
} from '../../redux/actions';
import {
  extractVariables
} from '../../services/code-to-question-service';

class PrendusGradeAssignment extends Polymer.Element implements AnalyticsAssignment {
  loaded: boolean = false;
  action: SetComponentPropertyAction;
  componentId: string;
  userToken: string;
  user: User;
  assignmentId: string;
  assignment: AnalyticsAssignment;
  rubric: Rubric;
  response: UserEssay;

  static get is() { return 'prendus-grade-assignment' }

  static get properties() {
    return {
      assignmentId: String,
      rubric: {
        type: Object,
        computed: '_computeRubric(response)'
      },
    }
  }

  constructor() {
    super();
    this.componentId = createUUID();
  }

  connectedCallback() {
    super.connectedCallback();
    this.action = fireLocalAction(this.componentId, 'assignment', this);
  }

  _computeRubric(response: UserEssay): Rubric | null {
    if (!response) return null;
    return parseRubric(response.questionResponse.question.code);
  }

  async loadItem(assignmentId: string): Promise<AnalyticsAssignmentLoadResult> {
    const data = await loadAssignment(assignmentId, this.user.id, this.userToken, this._handleGQLError.bind(this));
    const { assignment, essays } = data;
    const random = randomWithUngradedFirst(essays, assignment.numGradeResponses);
    const responses = random.length >= assignment.numGradeResponses ? random : [];
    return {
      title: assignment.title + ' Grade Assignment',
      items: responses,
      taken: assignment.graded.length
    };
  }

  error(): string {
    if (!this.grades || !this.rubric)
      return 'Prendus error, grades or rubric were undefined';
    if (this.grades.length !== Object.keys(this.rubric).length)
      return 'Prendus error, grades did not match rubric';
    if (this.grades.some(({ score }) => score < 0))
      return 'You must rate each category';
  }

  async submitItem(response: UserEssay): Promise<string> {
    await submit(this.grades, response.questionResponse.id, this.user.id);
    return response.questionResponse.question.id;
  }

  _response(e: CustomEvent) {
    this.action = fireLocalAction(this.componentId, 'response', e.detail.value);
  }

  _grades(e: CustomEvent) {
    this.action = fireLocalAction(this.componentId, 'grades', e.detail.value);
  }

  _handleGQLError(err: any) {
    this.action = setNotification(err.message, NotificationType.ERROR);
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    this.loaded = componentState.loaded;
    this.response = componentState.response;
    this.grades = componentState.grades;
    this.assignment = componentState.assignment;
    this.userToken = state.userToken;
    this.user = state.user;
  }
}

function submit(grades: CategoryScore[], responseId: string, userId: string, userToken: string, cb: (err: any) => void) {
  return GQLRequest(`
    mutation gradeResponse($grades: [QuestionResponseRatingscoresCategoryScore!]!, $responseId: ID!, $userId: ID!) {
      createQuestionResponseRating(
        raterId: $userId,
        questionResponseId: $responseId,
        scores: $grades
      ) {
        id
      }
    }
  `, {grades, responseId, userId}, userToken, cb);
}

function loadAssignment(assignmentId: string, userId: string, userToken: string, cb: (err: any) => void) {
  return GQLRequest(`
    query getAssignmentResponses($assignmentId: ID!, $userId: ID!) {
      assignment: Assignment(id: $assignmentId) {
        id
        course {
          id
        }
        title
        questionType
        numGradeResponses
        graded: questions(filter: {
          responses_some: {
            ratings_some: {
              rater: {
                id: $userId
              }
            }
          }
        }) {
          id
        }
      }
      essays: allUserEssays(filter: {
        questionResponse: {
          author: {
            id_not: $userId
          }
          question: {
            assignment: {
              id: $assignmentId
            }
          }
        }
      }) {
        value
        questionResponse {
          id
          question {
            id
            text
            code
          }
          _ratingsMeta {
            count
          }
        }
      }
    }
  `, {assignmentId, userId}, userToken, cb);
}

function randomWithUngradedFirst(essays: UserEssay[], num: number): UserEssay[] {
  const ungraded = essays.filter(essay => !essay.questionResponse._ratingsMeta.count);
  if (ungraded.length >= num)
    return shuffleArray(ungraded).slice(0, num);
  else if (!ungraded.length)
    return shuffleArray(essays).slice(0, num);
  const graded = essays.filter(essay => essay.questionResponse._ratingsMeta.count);
  return [...shuffleArray(ungraded), ...shuffleArray(graded).slice(0, num-ungraded.length)];
}

function parseRubric(code: string): Rubric {
  const { gradingRubric } = extractVariables(code);
  if (!gradingRubric) return {};
  return JSON.parse(gradingRubric.value);
}

window.customElements.define(PrendusGradeAssignment.is, PrendusGradeAssignment)
