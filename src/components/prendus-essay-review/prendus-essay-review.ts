import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {User} from '../../typings/user';
import {createUUID, shuffleArray} from '../../services/utilities-service';
import {GQLrequest} from '../../services/graphql-service';
import {extractVariables} from '../../services/code-to-question-service';
import {parse} from '../../node_modules/assessml/assessml';

class PrendusEssayReview extends Polymer.Element {
  loaded: boolean;
  action: SetPropertyAction | SetComponentPropertyAction;
  componentId: string;
  userToken: string | null;
  user: User;

  static get is() { return 'prendus-essay-review' }

  static get properties() {
    return {
      question: {
        type: Object,
        observer: '_initQuestion'
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

  _fireLocalAction(key: string, value: any) {
    this.action = {
      type: 'SET_COMPONENT_PROPERTY',
      componentId: this.componentId,
      key,
      value
    };
  }

  _initQuestion(question: Question) {
    this._fireLocalAction('question', question);
    if (question)
      this._fireLocalAction('rubric', this._parseRubric(question.code));
  }

  _questionText(text: string): string {
    if (!text) return '';
    return parse(text, null).ast[0].content.replace(/<p>|<\/p>/g, '');
  }

  _parseRubric(code: string): Rubric {
    const { gradingRubric } = extractVariables(code);
    return JSON.parse(gradingRubric.value);
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    const keys = Object.keys(componentState);
    if (keys.includes('loaded')) this.loaded = componentState.loaded;
    if (keys.includes('question')) this.question = componentState.question;
    if (keys.includes('questions')) this.questions = componentState.questions;
    if (keys.includes('rubric')) this.rubric = componentState.rubric;
    this.userToken = state.userToken;
    this.user = state.user;
  }

}

window.customElements.define(PrendusEssayReview.is, PrendusEssayReview)
