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
  pictures: File[];
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
    if (!init.some(distractor => Boolean(distractor)) {
      this._fireLocalAction('pictures', Array(init.length));
      // This mutation is necessary because the value of input[type="file"] cannot be set to an empty string by data binding
      // And we need to reset the value at the same time as the pictures so the on-change event will always be fired after clearing everything
      init.forEach((dummy, i) => {
        this.shadowRoot.querySelector(`#distractor-picture${i}`).value = '';
      });
    }
  }

  _notify(distractors: string[]) {
    const evt = new CustomEvent('distractors-changed', {composed: true, detail: {distractors}});
    this.dispatchEvent(evt);
  }

  _notifyPictures(pictures: File[]) {
    const evt = new CustomEvent('distractor-pictures-changed', {detail: {pictures}});
    this.dispatchEvent(evt);
  }

  _distractorsChanged(e: Event) {
    const distractors = [...this.distractors];
    distractors[e.model.itemsIndex] = e.target.value;
    this._fireLocalAction('distractors', distractors);
    this._notify(distractors);
  }

  _handlePicture(e: Event) {
    if (!e.target || !e.target.files || !e.target.files[0])
      return;
    const file = e.target.files[0];
    const ext = file.name.substr(file.name.lastIndexOf('.') + 1);
    if (ext !== 'png' && ext !== 'gif' && ext !== 'jpeg' && ext !== 'jpg')
      return;
    const i = e.model.itemsIndex;
    const pictures = [...this.pictures];
    pictures[i] = file;
    this._fireLocalAction('pictures', pictures);
    console.log(pictures);
    this._notifyPictures(pictures);
  }

  _triggerPicture(e: Event) {
    const i = e.model.itemsIndex;
    this.shadowRoot.querySelector(`#distractor-picture${i}`).click();
  }

  _picture(pictures: File[], index: number): string {
    return pictures[index] || null;
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
    if (keys.includes('pictures')) this.pictures = componentState.pictures;
  }
}

window.customElements.define(PrendusScaffoldDistractors.is, PrendusScaffoldDistractors);
