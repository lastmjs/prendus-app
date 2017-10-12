import {
  SetComponentPropertyAction,
  SetPropertyAction,
  Question
} from '../../typings/index.d';
import {GQLRequest} from '../../node_modules/prendus-shared/services/graphql-service';
import {createUUID, fireLocalAction} from '../../node_modules/prendus-shared/services/utilities-service';
import {NotificationType} from '../../services/constants-service';
import {setNotification} from '../../redux/actions';

class PrendusFlaggableQuestion extends Polymer.Element {
  action: SetComponentPropertyAction | SetPropertyAction;
  question: Question;
  loaded: boolean;

  static get is() { return 'prendus-flaggable-question' }

  static get properties() {
    return {
      question: Object,
    }
  }

  constructor() {
    super();
    this.componentId = createUUID();
  }

  _handleResponse(e: CustomEvent) {
    this.dispatchEvent(new CustomEvent('question-response', {detail: e.detail});
  }

  _openFlagQuestionModal(e) {
    this.shadowRoot.querySelector('#flagQuestionModal').open();
  }

  _handleError(err: any) {
    this.action = setNotification(err.message, NotificationType.ERROR);
  }

  async _createQuestionFlag(){
    const comment = this.shadowRoot.querySelector('#flag-response').value;
    const questionId = this.question.id;
    await flagQuestion(comment, questionId, this.userToken, this._handleError.bind(this));
    this.action = fireLocalAction(this.componentId, 'flagQuestionModalOpened', false)
    this.action = setNotification("Question Flagged", NotificationType.ERROR);
    this.shadowRoot.querySelector('#flagQuestionModal').close();
    this.dispatchEvent(new CustomEvent('question-flagged'));
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    this.loaded = componentState.loaded;
    this.userToken = state.userToken;
  }
}

async function flagQuestion(comment: string, questionId: string, userToken: string, cb: (err: any) => void) {
  return GQLRequest(`
    mutation questionFlag($comment: String!, $questionId: ID!){
      createQuestionFlag(
        comment: $comment
        questionId: $questionId
      ) {
      id
    }
  }`, {comment, questionId}, userToken, cb);
}

window.customElements.define(PrendusFlaggableQuestion.is, PrendusFlaggableQuestion)
