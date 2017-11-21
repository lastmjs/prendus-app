import {parse} from '../../node_modules/assessml/assessml';
import {createUUID} from '../../node_modules/prendus-shared/services/utilities-service';

class PrendusScaffoldExample extends Polymer.Element {
  componentId: string;
  action: SetPropertyAction | SetComponentPropertyAction;
  answers: QuestionScaffoldAnswer[];
  loaded: boolean;
  questionScaffold: QuestionScaffold;

  static get is() { return 'prendus-scaffold-example'; }
  static get properties() {
    return {
      questionScaffold: {
        type: Object,
      }
    };
  }

  constructor() {
    super();
    this.componentId = createUUID();
  }

  connectedCallback() {
    super.connectedCallback();
    this._fireLocalAction('loaded', true);
  }

  _questionText(text: string): string {
    if (!text) return '';
    return parse(text, null).ast[0].content.replace(/<p>|<\/p>/g, '');
  }

  _fireLocalAction(key: string, value: any) {
    this.action = {
      type: 'SET_COMPONENT_PROPERTY',
      componentId: this.componentId,
      key,
      value
    };
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    const keys = Object.keys(componentState);
    if (keys.includes('loaded')) this.loaded = componentState.loaded;
  }
}

window.customElements.define(PrendusScaffoldExample.is, PrendusScaffoldExample);
