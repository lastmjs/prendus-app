import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {User} from '../../typings/user';
import {createUUID, shuffleArray} from '../../services/utilities-service';
import {GQLrequest} from '../../services/graphql-service';

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
        observer: 'loadAssignment'
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
    this.addEventListener('carousel-data', this._handleNextQuestion.bind(this));
    this.addEventListener('response-submitted', this._handleResponse.bind(this));
  }

  _handleResponse(e) {
    const variables = {
      ...e.detail,
      questionId: this.question.id,
      authorId: this.user.id
    };
    try {
      this._validate(variables);
      this._submit(variables);
    } catch (err) {
      this._fireLocalAction('error' err);
      return;
    }
    this.$.carousel.nextData();
  }

  _handleNextQuestion(e) {
    this._fireLocalAction('question', e.detail.data);
  }

  _fireLocalAction(key: string, value: any) {
    this.action = {
      type: 'SET_COMPONENT_PROPERTY',
      componentId: this.componentId,
      key,
      value
    };
  }

  async loadAssignment(assignmentId: string): Assignment {
    const data = await GQLrequest(`query getAssignment($assignmentId: ID!) {
      assignment: Assignment(id: $assignmentId) {
        id
        title
        questionType
        questions {
          id
          text
          code
        }
      }
    }`, {assignmentId}, this.userToken);
    const { assignment } = data;
    const quota = assignment.questionType === 'ESSAY' ? 1 : 10;
    const questions = shuffleArray(assignment.questions).slice(0, quota);//assignment.takeQuota);
    this._fireLocalAction('assignment', assignment);
    this._fireLocalAction('questions', questions);
  }

  _validate(variables: object) {
  }

  _handleSubmit(data: Object) {
    if (data.errors) throw new Error("Error saving question rating");
    return data.createQuestionResponse.id;
  }

  async _saveResponse(variables: object) {
    const query = `mutation answerQuestion(
        $questionId: ID!,
        $userInputs: [QuestionResponseuserInputsUserInput!]!,
        $userVariables: [QuestionResponseuserVariablesUserVariable!]!,
        $userChecks: [QuestionResponseuserChecksUserCheck!]!,
        $userRadios: [QuestionResponseuserRadiosUserRadio!]!,
        $user: ID!
      ) {
      createQuestionResponse (
        authorId: $user
        questionId: $questionId
        userInputs: $userInputs
        userVariables: $userVariables
        userRadios: $userRadios
        userChecks: $userChecks
      ) {
        id
      }
    }`;
    return GQLrequest(query, variables, this.userToken).then(this._handleSubmit.bind(this))
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

window.customElements.define(PrendusTakeAssignment.is, PrendusTakeAssignment)
