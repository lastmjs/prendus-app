import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {User} from '../../typings/user';
import {GQLVariables} from '../../typings/gql-variables';
import {createUUID, shuffleArray} from '../../node_modules/prendus-shared/services/utilities-service';
import {QuestionType, NotificationType, ContextType} from '../../services/constants-service';
import {setNotification, getAndSetUser} from '../../redux/actions';
import {LTIPassback} from '../../services/lti-service';
import {sendStatement} from '../../services/analytics-service';
import {GQLRequest} from '../../node_modules/prendus-shared/services/graphql-service';

class PrendusTakeAssignment extends Polymer.Element {
  loaded: boolean;
  action: SetPropertyAction | SetComponentPropertyAction;
  componentId: string;
  userToken: string | null;
  user: User;

  static get is() { return 'prendus-take-assignment' }

  static get properties() {
    return {
      assignmentId: {
        type: String,
        observer: 'generateQuiz'
      }
    }
  }

  constructor() {
    super();
    this.componentId = createUUID();
  }

  connectedCallback() {
    super.connectedCallback();
    this._fireLocalAction('loaded', true);
  }

  _handleResponse(e: CustomEvent) {
    try {
      if (this.assignment.questionType === QuestionType.ESSAY)
        validateEssay(e.detail.userEssays);
      else if (this.assignment.questionType === QuestionType.MULTIPLE_CHOICE)
        validateMultipleChoice(e.detail.userRadios);
      this._saveResponse({
        ...e.detail,
        questionId: this.question.id,
        authorId: this.user.id
      });
    } catch (err) {
      alert(err.message);
      return;
    }
    this.shadowRoot.querySelector('#carousel').nextData();
  }

  _handleNextQuestion(e: CustomEvent) {
    const { data } = e.detail;
    this._fireLocalAction('question', data);
    if (data && data === this.questions[0])
      sendStatement(this.user.id, this.assignment.id, ContextType.QUIZ, 'STARTED', 'QUIZ');
    else
      sendStatement(this.user.id, this.assignment.id, ContextType.QUIZ, 'RESPONDED', 'QUIZ');
    if (!data)
      LTIPassback(this.user.id, this.assignment.id, ContextType.QUIZ);
  }

  _fireLocalAction(key: string, value: any) {
    this.action = {
      type: 'SET_COMPONENT_PROPERTY',
      componentId: this.componentId,
      key,
      value
    };
  }

  _handleError(err: any) {
    this.action = setNotification(err.message, NotificationType.ERROR);
  }

  //TODO: this seems to be getting called twice...
  async generateQuiz(assignmentId: string) {
    this._fireLocalAction('loaded', false);
    this.action = await getAndSetUser();
    const assignment = await this._assignment(assignmentId);
    this._fireLocalAction('assignment', assignment);
    const questionIds = shuffleArray(assignment.questions).slice(0, assignment.numResponseQuestions).map(question => question.id);
    const questions = await this._createQuiz(questionIds, this.user.id);
    this._fireLocalAction('questions', questions);
    this._fireLocalAction('loaded', true);
  }

  async _assignment(assignmentId: string): Promise<Assignment> {
    const data = await GQLRequest(`query getAssignment($assignmentId: ID!) {
      assignment: Assignment(id: $assignmentId) {
        id
        title
        numResponseQuestions
        questionType
        questions {
          id
        }
      }
    }`, {assignmentId}, this.userToken, this._handleError.bind(this));
    if (!data) {
      return;
    }
    return data.assignment;
  }

  async _createQuiz(questionIds: string[], userId: string): Promise<Question[]> {
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
    }`, {questionIds, userId}, this.userToken, this._handleError.bind(this));
    if (!data) {
      return [];
    }
    return data.createQuiz.questions;
  }

  async _saveResponse(variables: GQLVariables) {
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
    return GQLRequest(query, variables, this.userToken, this._handleError.bind(this));
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    const keys = Object.keys(componentState);
    if (keys.includes('loaded')) this.loaded = componentState.loaded;
    if (keys.includes('assignment')) this.assignment = componentState.assignment;
    if (keys.includes('questions')) this.questions = componentState.questions;
    if (keys.includes('question')) this.question = componentState.question;
    if (keys.includes('error')) this.error = componentState.error;
    this.userToken = state.userToken;
    this.user = state.user;
  }

}

function validateEssay(essays: UserEssay[]) {
  if (!essays.length || !essays[0].value || !essays[0].value.trim().length)
    throw new Error('Your essay response is empty');
}

function validateMultipleChoice(radios: UserRadio[]) {
  if (!radios.length || !radios.reduce((bitOr, radio) => bitOr || radio.checked, false))
    throw new Error('You must select an answer');
}

window.customElements.define(PrendusTakeAssignment.is, PrendusTakeAssignment)
