import {
  SetComponentPropertyAction,
  User,
  UserEssay,
  Rubric,
  Assignment
} from '../../typings/index.d';
import {
  createUUID,
  fireLocalAction
} from '../../node_modules/prendus-shared/services/utilities-service';
import {shuffleArray} from '../../services/utilities-service'; //TODO: Move into prendus-shared when Jordan is back
import {GQLRequest} from '../../node_modules/prendus-shared/services/graphql-service';
import {
  QuestionType,
  NotificationType,
  ContextType,
  VerbType,
  ObjectType
} from '../../services/constants-service';
import {setNotification} from '../../redux/actions';
import {sendStatement} from '../../services/analytics-service';
import {LTIPassback} from '../../services/lti-service';
import {extractVariables} from '../../services/code-to-question-service';
import {parse} from '../../node_modules/assessml/assessml';

class PrendusGradeAssignment extends Polymer.Element {
  loaded: boolean = false;
  action: SetComponentPropertyAction;
  componentId: string;
  userToken: string;
  user: User;
  assignmentId: string;
  rubric: Rubric;
  responses: UserEssay[];
  response: UserEssay;
  completionReason: string;
  finished: boolean;
  modalOpen: boolean;

  static get is() { return 'prendus-grade-assignment' }

  static get properties() {
    return {
      assignmentId: String,
      rubric: {
        type: Object,
        computed: '_computeRubric(response)'
      },
      completionReason: {
        type: String,
        computed: '_computeCompletionReason(assignment, responses)'
      }
    }
  }

  constructor() {
    super();
    this.componentId = createUUID();
  }

  _computeRubric(response: UserEssay): Rubric | null {
    if (!response) return null;
    return parseRubric(response.questionResponse.question.code);
  }

  _computeCompletionReason(assignment: Assignment, responses: UserEssay[]): string {
    return responses && responses.length > assignment.numReviewQuestions
      ? 'You have completed this assignment'
      : 'There are not enough responses to take the assignment yet';
  }

  _questionText(text: string): string {
    if (!text) return '';
    return parse(text, null).ast[0].content.replace(/<p>|<p style=".*">|<\/p>|<img.*\/>/g, '');
  }

  _questionPicture(text: string): string {
    if (!text) return '';
    const m = parse(text, null).ast[0].content.match(/<img src="(.*)"/);
    return m ? m[1] : '';
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

  async _handleNextRequest(e: CustomEvent) {
    try {
      validate(this.rubric, this.grades);
      await submit(this.grades, this.response.questionResponse.id, this.user.id);
      this.shadowRoot.querySelector('#carousel').nextData();
    } catch (err) {
      this.action = setNotification(err.message, NotificationType.ERROR);
    }
  }

  _handleNextResponse(e: CustomEvent) {
    const response = e.detail.data;
    const statement = { userId: this.user.id, assignmentId: this.assignment.id, courseId: this.assignment.course.id };
    if (response && response === this.responses[0])
      sendStatement(this.userToken, { ...statement, verb: VerbType.STARTED });
    else
      sendStatement(this.userToken, { ...statement, verb: VerbType.GRADED, questionId: this.response.questionResponse.question.id });
    this.action = fireLocalAction(this.componentId, 'response', response);
  }

  _handleFinished(e: CustomEvent) {
    const finished = e.detail.value;
    this.action = fireLocalAction(this.componentId, 'finished', finished);
    if (!finished)
      return;
    if (this.responses && this.responses.length)
      this.gradePassback();
  }

  async gradePassback() {
    try {
      await LTIPassback(this.userToken, this.user.id, this.assignment.id, this.assignment.course.id, getCookie('ltiSessionIdJWT'));
      this.action = setNotification('Grade passback succeeded.', NotificationType.SUCCESS);
    }
    catch(error) {
      console.error(error);
      //      this.action = setNotification('Grade passback failed. Retrying...', NotificationType.ERROR);
      //      setTimeout(() => {
      //          this.gradePassback();
      //      }, 5000);
    }
    this.dispatchEvent(new CustomEvent('grades-submitted'));
  }

  async _loadAssignment() {
    this.action = fireLocalAction(this.componentId, 'loaded', false);
    const data = await loadAssignment(this.assignmentId, this.user.id, this.userToken, this._handleGQLError.bind(this));
    const { assignment, essays } = data;
    this.action = fireLocalAction(this.componentId, 'assignment', assignment);
    if (assignment.graded.length)
      this.action = setNotification('You have already completed this assignment', NotificationType.WARNING);
    const random = randomWithUngradedFirst(essays, assignment.numGradeResponses);
    const responses = random.length >= assignment.numGradeResponses ? random : [];
    this.action = fireLocalAction(this.componentId, 'responses', responses);
    this.action = fireLocalAction(this.componentId, 'loaded', true);
  }

  _handleGQLError(err: any) {
    this.action = setNotification(err.message, NotificationType.ERROR);
  }

  _handleGrades(e: CustomEvent) {
    this.action = fireLocalAction(this.componentId, 'grades', e.detail.scores);
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    this.loaded = componentState.loaded;
    this.assignment = componentState.assignment;
    this.response = componentState.response;
    this.grades = componentState.grades;
    this.finished = componentState.finished;
    this.modalOpen = componentState.modalOpen;
    this.userToken = state.userToken;
    this.user = state.user;
  }
}

function validate(rubric: Rubric, grades: CategoryScore[]) {
  if (grades.some(({ score }) => score < 0))
    throw new Error('You must rate each category');
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
        graded(filter: {
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
            text
            code
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
