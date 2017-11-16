import {
  SetComponentPropertyAction,
  User,
  Question,
  Assignment
} from '../../typings/index.d';
import {
  createUUID,
  fireLocalAction
} from '../../node_modules/prendus-shared/services/utilities-service';
import {shuffleArray} from '../../services/utilities-service'; //TODO: Move into prendus-shared when Jordan is back
import {
  QuestionType,
  NotificationType,
  ContextType,
  VerbType,
  ObjectType
} from '../../services/constants-service';
import {setNotification} from '../../redux/actions';
import {LTIPassback} from '../../services/lti-service';
import {sendStatement} from '../../services/analytics-service';
import {GQLRequest} from '../../node_modules/prendus-shared/services/graphql-service';

class PrendusTakeAssignment extends Polymer.Element {
  loaded: boolean = false;
  action: SetComponentPropertyAction;
  componentId: string;
  userToken: string;
  user: User;
  assignment: Assignment;
  question: Question;
  questions:  Question[];
  completionReason: string;
  submitted: string[] = [];
  finished: boolean;
  modalOpen: boolean;

  static get is() { return 'prendus-take-assignment' }

  static get properties() {
    return {
      assignmentId: String,
      completionReason: {
        type: String,
        computed: '_computeCompletionReason(assignment)'
      }
    }
  }

  constructor() {
    super();
    this.componentId = createUUID();
  }

  _computeCompletionReason(assignment: Assignment): string {
    return assignment.questions.length < assignment.numResponseQuestions
      ? 'There are not enough questions to take the assignment yet'
      : 'You have completed this assignment';
  }

  async _loadAssignment() {
    this.action = fireLocalAction(this.componentId, 'loaded', false);
    const errCb = this._handleError.bind(this);
    const assignment = await loadAssignment(assignmentId, this.user.id, this.userToken, errCb);
    this.action = fireLocalAction(this.componentId, 'assignment', assignment);
    if (assignment.questions.length < assignment.numResponseQuestions)
      return;
    if (assignment.taken.length)
      this.action = setNotification('You have already taken this assignment', NotificationType.WARNING);
    const questionIds = shuffleArray(assignment.questions)
      .slice(0, assignment.numResponseQuestions)
      .map(question => question.id);
    const questions = await createQuiz(questionIds, this.user.id, this.userToken, errCb);
    this.action = fireLocalAction(this.componentId, 'questions', shuffleArray(questions));
    this.action = fireLocalAction(this.componentId, 'loaded', true);
    this.dispatchEvent(new CustomEvent('assignment-loaded'));
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

  async _handleResponse(e: CustomEvent) {
    try {
      if (this.assignment.questionType === QuestionType.ESSAY)
        validateEssay(e.detail.userEssays);
      else if (this.assignment.questionType === QuestionType.MULTIPLE_CHOICE)
        validateMultipleChoice(e.detail.userRadios);
      await saveResponse({
        ...e.detail,
        questionId: this.question.id,
        authorId: this.user.id
      });
    } catch (err) {
      alert(err.message); //Notification conflicts with paper-toast used in prendus-question-elements
    }
  }

  _handleNextQuestion(e: CustomEvent) {
    const { data } = e.detail;
    if (!this.question || this.submitted.indexOf(this.question.id) === -1) {
      this.action = fireLocalAction(this.componentId, 'submitted', [...this.submitted, this.question.id]);
      const statement = { userId: this.user.id, assignmentId: this.assignment.id, courseId: this.assignment.course.id };
      if (data && data === this.questions[0])
        sendStatement(this.userToken, { ...statement, VerbType.STARTED });
      else
        sendStatement(this.userToken, { ...statement, VerbType.RESPONDED, questionId: this.question.id });
    }
    this.action = fireLocalAction(this.componentId, 'question', data);
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
      console.error(error);
      //      this.action = setNotification('Grade passback failed. Retrying...', NotificationType.ERROR);
      //      setTimeout(() => {
      //          this.gradePassback();
      //      }, 5000);
    }
  }

  _nextClick(e: CustomEvent) {
    this.shadowRoot.querySelector('#carousel').nextData();
  }

  _backClick(e: CustomEvent) {
    this.shadowRoot.querySelector.('#carousel').previousData();
  }

  _handleError(err: any) {
    this.action = setNotification(err.message, NotificationType.ERROR);
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    this.loaded = componentState.loaded;
    this.assignment = componentState.assignment;
    this.question = componentState.question;
    this.submitted = componentState.submitted || [];
    this.finished = componentState.finished;
    this.modalOpen = componentState.modalOpen;
    this.userToken = state.userToken;
    this.user = state.user;
  }

}

function loadAssignment(assignmentId: string, userId: string, userToken: string, cb: (err: any) => void): Promise<object> {
  return GQLRequest(`
    query getAssignment($assignmentId: ID!, $userId: ID!) {
      assignment: Assignment(id: $assignmentId) {
        id
        course {
          id
        }
        title
        numResponseQuestions
        questionType
        questions(filter: {
          AND: [{
            author: {
              id_not: $userId
            }
          }, {
            ratings_some: {}
          }, {
              ratings_every: {
                scores_some: {
                  category: "Inclusion"
                  score_gt: 1
                }
              }
          }, {
            flags_none: {}
          }]
        }) {
          id
        }
        taken: questions(filter: {
          responses_some: {
            author: {
              id: $userId
            }
          }
        }) {
          id
        }
      }
    }
  `, {assignmentId, userId}, userToken, cb);
}

function saveResponse(variables: object, userToken: string, cb: (err: any) => void): Promise {
  const query = `mutation answerQuestion(
      $questionId: ID!,
      $userInputs: [QuestionResponseuserInputsUserInput!]!,
      $userEssays: [QuestionResponseuserEssaysUserEssay!]!,
      $userVariables: [QuestionResponseuserVariablesUserVariable!]!,
      $userChecks: [QuestionResponseuserChecksUserCheck!]!,
      $userRadios: [QuestionResponseuserRadiosUserRadio!]!,
      $authorId: ID!
    ) {
    createQuestionResponse (
      authorId: $authorId
      questionId: $questionId
      userInputs: $userInputs
      userEssays: $userEssays
      userVariables: $userVariables
      userRadios: $userRadios
      userChecks: $userChecks
    ) {
      id
    }
  }`;
  return GQLRequest(query, variables, userToken, cb);
}

async function createQuiz(questionIds: string[], userId: string, userToken: string, cb: (err: any) => void): Promise<Question[]> {
  const data = await GQLRequest(`
    mutation quiz($userId: ID!, $questionIds: [ID!]!){
      createQuiz(
        authorId: $userId
        title: "Assignment Quiz"
        questionsIds: $questionIds
      ) {
      questions {
        id
        text
        code
      }
    }
  }`, {questionIds, userId}, userToken, cb);
  if (!data) {
    return [];
  }
  return data.createQuiz.questions;
}

function validateEssay(essays: UserEssay[]) {
  if (!essays.length || !essays[0].value || !essays[0].value.trim().length)
    throw new Error('Your essay response is empty');
}

function validateMultipleChoice(radios: UserRadio[]) {
  if (!radios.length || !radios.some(({ checked }) => checked))
    throw new Error('You must select an answer');
}

window.customElements.define(PrendusTakeAssignment.is, PrendusTakeAssignment)
