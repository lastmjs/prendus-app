import {
  SetComponentPropertyAction,
  User,
  Question,
  Assignment,
  AnalyticsAssignmentLoadResult,
  AnalyticsAssignment
} from '../../../prendus.d';
import {
  createUUID,
  fireLocalAction
} from '../../node_modules/prendus-shared/services/utilities-service';
import {shuffleArray} from '../../services/utilities-service'; //TODO: Move into prendus-shared when Jordan is back
import {
  QuestionType,
  NotificationType,
} from '../../services/constants-service';
import {
  setNotification
} from '../../redux/actions';
import {
  GQLRequest
} from '../../node_modules/prendus-shared/services/graphql-service';

class PrendusTakeAssignment extends Polymer.Element implements AnalyticsAssignment {
  loaded: boolean = false;
  action: SetComponentPropertyAction;
  componentId: string;
  userToken: string;
  user: User;
  assignment: Assignment;
  _assignment: AnalyticsAssignment;
  question: Question;

  static get is() { return 'prendus-take-assignment' }

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
    this.action = fireLocalAction(this.componentId, '_assignment', this);
  }

  async load(assignmentId: string): Promise<AnalyticsAssignmentLoadResult> {
    const assignment = await loadAssignment(assignmentId, this.user.id, this.userToken, this._handleError.bind(this));
    this.action = fireLocalAction(this.componentId, 'assignment', assignment);
    const questions = assignment.questions.length > assignment.numResponseQuestions
      ? shuffleArray(assignment.questions).slice(0, assignment.numResponseQuestions)
      : [];
    return {
      title: assignment.title + ' Quiz Assignment',
      items: questions,
      taken: assignment.taken.length
    };
  }

  error(): null {
    return null; //validation taken care of while saving response
  }

  async submit(question: Question): Promise<string> {
    return question.id;
  }

  async _response(e: CustomEvent) {
    const err = this.assignment.questionType === QuestionType.ESSAY
      ? validateEssay(e.detail.userEssays)
      : validateMultipleChoice(e.detail.userRadios);
    if (err) {
      this.action = setNotification(err, NotificationType.ERROR);
      return;
    }
    await saveResponse({
      ...e.detail,
      questionId: this.question.id,
      authorId: this.user.id
    });
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
    this.loaded = componentState.loaded;
    this.assignment = componentState.assignment;
    this._assignment = componentState._assignment;
    this.question = componentState.question;
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

function validateEssay(essays: UserEssay[]) {
  if (!essays.length || !essays[0].value || !essays[0].value.trim().length)
    return 'Your essay response is empty';
}

function validateMultipleChoice(radios: UserRadio[]) {
  if (!radios.length || !radios.some(({ checked }) => checked))
    return 'You must select an answer';
}

window.customElements.define(PrendusTakeAssignment.is, PrendusTakeAssignment)
