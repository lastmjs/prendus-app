import {createUUID} from '../../node_modules/prendus-shared/services/utilities-service';

/*
 * This component takes an array of concepts and displays a dropdown menu.
 * If the array is empty it displays an text input field.
 * When a concept is selected or created an event `concept-selected` is fired.
 * If the concept was selected from the dropdown menu then the `id` field will be populated.
 * If it was typed then a concept object with fields `id` `subjectId` and `assignmentsIds` is returned.
 * Intended use: The parent component will consume the event and either create the concept to get the id
 * or just use the id selected
 */

class PrendusScaffoldConcept extends Polymer.Element {
  componentId: string;
  action: SetPropertyAction | SetComponentPropertyAction;
  loaded: boolean;
  concept: Concept;

  static get is() { return 'prendus-scaffold-concept'; }
  static get properties() {
    return {
      assignment: Object,
      selectedConcept: {
        type: Object,
        observer: '_conceptChanged'
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

  _conceptChanged(concept: Concept) {
    if (!concept && !this.assignment.concepts.length)
      this._fireLocalAction('selectedConcept', {
        title: '',
        subjectId: this.assignment.course.subject.id,
        assignmentsIds: [this.assignment.id]
      });
  }

  _notify(concept) {
    const evt = new CustomEvent('concept-selected', {bubbles: false, composed: true, detail: {concept}});
    this.dispatchEvent(evt);
  }

  saveConcept(e) {
    const concept = this.assignment.concepts[e.model.itemsIndex];
    this._fireLocalAction('selectedConcept', concept);
    this._notify(concept);
  }

  createConcept(e) {
    const concept = {
      title: e.target.value,
      subjectId: this.assignment.course.subject.id,
      // assignmentsIds: [this.assignment.id]
    };
    this._fireLocalAction('selectedConcept', concept);
    this._notify(concept);
  }

  stateChange(e: CustomEvent) {
    const componentState = e.detail.state.components[this.componentId] || {};
    const keys = Object.keys(componentState);
    if (keys.includes('loaded')) this.loaded = componentState.loaded;
    if (keys.includes('selectedConcept')) this.selectedConcept = componentState.selectedConcept;
  }
}

window.customElements.define(PrendusScaffoldConcept.is, PrendusScaffoldConcept);
