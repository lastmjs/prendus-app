import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {isDefinedAndNotEmpty} from '../../services/utilities-service';
import {createUUID} from '../../services/utilities-service';

/*
 * This component takes a question and answer and displays text inputs to type incorrect answers.
 * Every time the array of incorrect answers changes, the component fires and event `distractors-changed`
 * Intended use: the parent component can consume the event and use the distractors in creating a question.
 * In the future, this component could take a type attribute: radio or checkbox and could allow the user
 * to create as many correct and incorrect answers that they wanted
 */
class PrendusScaffoldDistractors extends Polymer.Element {
  componentId: string;
  action: SetPropertyAction | SetComponentPropertyAction;
  loaded: boolean;
  distractors: any[];
  answer: string;

  static get is() { return 'prendus-scaffold-distractors'; }

  static get properties() {
    return {
      question: String,
      answer: String,
      init: {
        type: Array,
        observer: '_init'
      }
    }
  }

  constructor() {
    super();
    this.componentId = createUUID();
  }

  connectedCallback() {
    super.connectedCallback();
  }

  _fireLocalAction(key: string, value: any) {
    this.action = {
      type: 'SET_COMPONENT_PROPERTY',
      componentId: this.componentId,
      key,
      value
    }
  }

  _init(init: string[]) {
    this._fireLocalAction('distractors', init);
  }

  _notify(distractors: string[]) {
    const evt = new CustomEvent('distractors-changed', {composed: true, detail: {distractors}});
    this.dispatchEvent(evt);
  }

  _distractorsChanged(e) {
    const distractors = this.distractors.slice();
    distractors[e.model.itemsIndex] = e.target.value;
    this._fireLocalAction('distractors', distractors);
    this._notify(distractors);
  }

  plusOne(num: number): number {
    return num + 1;
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    const keys = Object.keys(componentState);
    if (keys.includes('loaded')) this.loaded = componentState.loaded;
    if (keys.includes('distractors')) this.distractors = componentState.distractors;
  }
}

window.customElements.define(PrendusScaffoldDistractors.is, PrendusScaffoldDistractors);
