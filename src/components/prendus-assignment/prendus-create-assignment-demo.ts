import {createUUID} from '../../services/utilities-service';
import {SetComponentPropertyAction} from '../../typings/actions';
import {State} from '../../typings/state';

class PrendusCreateAssignmentDemo extends Polymer.Element {
    componentId: string;
    selected: SetComponentPropertyAction;
    action: SetComponentPropertyAction;

    static get is() { return 'prendus-create-assignment-demo'; }

    constructor() {
      super();
      this.componentId = 'asdf9s8d9g8s9dg';
    //   this.componentId = createUUID(); //TODO this was stopping the component from loading for some reason
    }

    connectedCallback() {
        super.connectedCallback();

        this.action = fireLocalAction(this.componentId, 'selected', 0);
    }

    selectedChanged(e: CustomEvent) {
        this.action = fireLocalAction(this.componentId, 'selected', e.detail.value);
    }

    stateChange(e: CustomEvent) {
        const state: State = e.detail.state;

        if (state.components[this.componentId]) this.selected = state.components[this.componentId].selected;
    }
}

window.customElements.define(PrendusCreateAssignmentDemo.is, PrendusCreateAssignmentDemo);

function fireLocalAction(componentId: string, key: string, value: any): SetComponentPropertyAction {
    return {
        type: 'SET_COMPONENT_PROPERTY',
        componentId,
        key,
        value
  };
}
