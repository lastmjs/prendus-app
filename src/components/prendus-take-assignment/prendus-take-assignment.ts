import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {User} from '../../typings/user';
import {createUUID, shuffleArray} from '../../services/utilities-service';
import {parse} from '../../node_modules/assessml/assessml';
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
    this.addEventListener('carousel-next', this._handleNextRequest.bind(this));
    this.addEventListener('carousel-data', this._handleNextQuestion.bind(this));
  }

  _handleNextRequest(e) {
    if (this._valid(this.response) && this._submit(this.question, this.response))
      this.$.carousel.nextData();
    else
      console.log('Error!');
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

  _questionText(text: string): string {
    if (!text) return '';
    return parse(text, null).ast[0].content.replace('<p>', '').replace('</p><p>', ''));
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
    const questions = shuffleArray(assignment.questions).slice(0, 1);//assignment.takeQuota);
    this._fireLocalAction('assignment', assignment);
    this._fireLocalAction('questions', questions);
  }

  _valid(response: string): boolean {
    return response && response.length;
  }

  _storeResponse(e) {
    this._fireLocalAction('response', e.target.value);
  }

  _handleSubmit(data: Object) {
    if (data.errors) throw new Error("Error saving question rating");
    return true;
  }

  _handleError(err) {
    console.error(err);
    return false;
  }

  _submit(question: Object, response: string) {
    const query = `mutation answerQuestion($questionId: ID!, $response: String!, $user: ID!) {
      createQuestionResponse (
        authorId: $user
        questionId: $questionId
        responses: [
          {
            type: INPUT
            name: "essay1"
            value: $response
          }
        ]
      ) {
        id
      }
    }`;
    const variables = {
      questionId: question.id,
      response,
      user: this.user.id
    };
    return GQLrequest(query, variables, this.userToken)
      .then(this._handleSubmit.bind(this))
      .catch(this._handleError);
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    const keys = Object.keys(componentState);
    if (keys.includes('loaded')) this.loaded = componentState.loaded;
    if (keys.includes('assignment')) this.assignment = componentState.assignment;
    if (keys.includes('questions')) this.questions = componentState.questions;
    if (keys.includes('question')) this.question = componentState.question;
    if (keys.includes('response')) this.response = componentState.response;
    this.userToken = state.userToken;
    this.user = state.user;
  }

}

window.customElements.define(PrendusTakeAssignment.is, PrendusTakeAssignment)
