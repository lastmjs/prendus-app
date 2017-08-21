import {SetPropertyAction, SetComponentPropertyAction, DefaultAction} from '../../typings/actions';
import {isDefinedAndNotEmpty, getQuestionScaffoldAnswers} from '../../services/utilities-service';
import {createUUID} from '../../services/utilities-service';

/*
 * This component takes a question and an array of answers, assuming the first is the correct answer.
 * It displays a text input for each answer as a place for the user to provide comments and/or hints for that answer
 * It fires an event `hints-changed` whenever the data changes
 * Intended use: the parent component will consume the event and use these to create answer comments for new questions.
 * In the future this component should probably take an array of answer objects that can be correct or incorrect in any order
 */
class PrendusScaffoldComments extends Polymer.Element {
  componentId: string;
  action: SetPropertyAction | SetComponentPropertyAction;
  loaded: boolean;

  static get is() { return 'prendus-scaffold-comments'; }
  static get properties() {
    return {
      question: String,
      answers: {
        type: Array,
        observer: '_initHints'
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

  _fireLocalAction(key: string, value: any) {
    this.action = {
      type: 'SET_COMPONENT_PROPERTY',
      componentId: this.componentId,
      key,
      value
    };
  }

  _initHints(answers: string[]) {
    //assuming first answer is correct
    const hints = ['Correct'].concat(answers.slice(1, answers.length).map(answer => 'Incorrect'));
    this._fireLocalAction('hints' hints);
    this._notify(hints);
  }

  _notify(hints: string[]) {
    const evt = new CustomEvent('hints-changed', {bubbles: false, composed: true, detail: {hints}});
    this.dispatchEvent(evt);
  }

  _hintsChanged(e) {
    const hints = this.hints.slice();
    hints[e.model.itemsIndex] = e.target.value;
    this._fireLocalAction('hints', hints);
    this._notify(hints);
  }

  createComment(index: number){
    return index !== 0 ? 'Incorrect' : 'Correct'
  }

  plusOne(index: number): number {
    return index + 1;
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    const keys = Object.keys(componentState);
    if (keys.includes('loaded')) this.loaded = componentState.loaded;
    if (keys.includes('hints')) this.hints = componentState.hints;
  }
}

window.customElements.define(PrendusScaffoldComments.is, PrendusScaffoldComments);
