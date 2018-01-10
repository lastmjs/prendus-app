import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {createUUID} from '../../node_modules/prendus-shared/services/utilities-service';
import {setNotification} from '../../redux/actions';
import {NotificationType} from '../../services/constants-service';

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
      question: Object,
      answer: Object,
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
    init.forEach((distractor, i) => {
      if (!distractor.picture) {//We can't clear this through data binding, so we need this mutation
        const fileInput = this.shadowRoot.getElementById(`distractor-picture${i}`);
        if (fileInput) fileInput.value = '';
      }
    });
  }

  _notify(distractors: string[]) {
    const evt = new CustomEvent('distractors-changed', {composed: true, detail: {distractors}});
    this.dispatchEvent(evt);
  }

  _distractorsChanged(e: Event) {
    const i = e.model.itemsIndex;
    const distractors = [
      ...this.distractors.slice(0, i),
      {...this.distractors[i], text: e.target.value},
      ...this.distractors.slice(i + 1)
    ];
    this._fireLocalAction('distractors', distractors);
    this._notify(distractors);
  }

  _handlePicture(e: Event) {
    if (!e.target || !e.target.files || !e.target.files[0])
      return;
    const file = e.target.files[0];
    const ext = file.name.substr(file.name.lastIndexOf('.') + 1).toLowerCase();
    if (ext !== 'png' && ext !== 'gif' && ext !== 'jpeg' && ext !== 'jpg') {
      this.action = setNotification('The file does not have an image file extension.', NotificationType.ERROR);
      return;
    }
    const i = e.model.itemsIndex;
    const distractors = [
      ...this.distractors.slice(0, i),
      {...this.distractors[i], picture: file},
      ...this.distractors.slice(i + 1)
    ];
    this._fireLocalAction('distractors', distractors);
    this._notify(distractors);
  }

  _triggerPicture(e: Event) {
    const i = e.model.itemsIndex;
    this.shadowRoot.querySelector(`#distractor-picture${i}`).click();
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
