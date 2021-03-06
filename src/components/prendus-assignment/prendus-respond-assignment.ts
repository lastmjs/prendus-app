import {
  SetComponentPropertyAction,
  User,
  Question,
  Assignment,
  AssignmentFunctionsLoadResult,
  AssignmentFunctions
} from '../../prendus.d';
import {
  createUUID,
  fireLocalAction
} from '../../node_modules/prendus-shared/services/utilities-service';
import {shuffleArray} from '../../services/utilities-service'; //TODO: Move into prendus-shared when Jordan is back
import {
  QuestionType,
  NotificationType,
  ASSIGNMENT_VALIDATION_ERROR,
} from '../../services/constants-service';
import {
  setNotification
} from '../../redux/actions';
import {
  GQLRequest
} from '../../node_modules/prendus-shared/services/graphql-service';

class PrendusRespondAssignment extends Polymer.Element implements AssignmentFunctions {
  action: SetComponentPropertyAction;
  componentId: string;
  userToken: string;
  user: User;
  assignment: Assignment;
  functions: AssignmentFunctions;
  question: Question;
  attempted: string[];

  static get is() { return 'prendus-respond-assignment' }

  static get properties() {
    return {
      assignmentId: String,
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

  async loadItems(assignmentId: string): Promise<AssignmentFunctionsLoadResult> {
    const { assignment } = await loadAssignment(assignmentId, this.user.id, this.userToken, this._handleError.bind(this));
    this.action = fireLocalAction(this.componentId, 'assignment', assignment);
    const questions = assignment.questions.length >= assignment.numResponseQuestions
      ? shuffleArray(assignment.questions).slice(0, assignment.numResponseQuestions)
      : [];
    return {
      title: assignment.title + ' Quiz Assignment',
      items: questions,
      taken: assignment.taken.length
    };
  }

  error(question: Question): string | null {
    return this.attempted.indexOf(question.id) > -1 ? null : 'You must select an answer and click "Check" first';
  }

  async submitItem(question: Question): Promise<string> {
    return question.id;
  }

  async _response(e: CustomEvent) {
    const err = this.assignment.questionType === QuestionType.ESSAY
      ? validateEssay(e.detail.userEssays)
      : validateMultipleChoice(e.detail.userRadios);
    if (err) {
      alert(err);
      return;
    } else {
      this.action = fireLocalAction(this.componentId, 'attempted', this.attempted.concat(this.question.id));
    }
    await saveResponse({
      ...e.detail,
      questionId: this.question.id,
      authorId: this.user.id
    }, this.userToken, this._handleError.bind(this));
  }

  _question(e: CustomEvent) {
    this.action = fireLocalAction(this.componentId, 'question', e.detail.value);
  }

  _handleError(err: any) {
    this.action = setNotification(err.message, NotificationType.ERROR);
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    this.assignment = componentState.assignment;
    this.functions = componentState.functions;
    this.question = componentState.question;
    this.attempted = componentState.attempted || [];
    this.userToken = state.userToken;
    this.user = state.user;
  }

}

function loadAssignment(assignmentId: string, userId: string, userToken: string, cb: (err: any) => void): Promise<object> {
  return GQLRequest(`
    query getAssignment($assignmentId: ID!, $userId: ID!) {
      assignment: Assignment(id: $assignmentId) {
        id
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
                category: "Use in Test"
                score_gt: 1
              }
            }
          }, {
            flags_none: {}
          }]
        }) {
          id
          text
          code
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

function validateEssay(essays: UserEssay[]) {
  if (!essays.length || !essays.every(essay => essay && essay.value && essay.value.trim().length))
    return 'Your essay response is empty';
}

function validateMultipleChoice(radios: UserRadio[]) {
  if (!radios.length || !radios.some(({ checked }) => checked))
    return 'You must select an answer';
}

window.customElements.define(PrendusRespondAssignment.is, PrendusRespondAssignment)
