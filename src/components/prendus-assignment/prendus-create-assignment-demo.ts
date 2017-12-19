import {SetComponentPropertyAction} from '../../typings/actions';
import {State} from '../../typings/state';
import {fireLocalAction, createUUID} from '../../node_modules/prendus-shared/services/utilities-service';

class PrendusCreateAssignmentDemo extends Polymer.Element {
    componentId: string;
    action: SetComponentPropertyAction;
    question: {
        text: string;
        code: string;
    };

    static get is() { return 'prendus-create-assignment-demo'; }

    constructor() {
      super();
      this.componentId = createUUID();
    }

    connectedCallback() {
        super.connectedCallback();
    }

    submitClick() {
        alert('Submitted');
    }

    stateChange(e: CustomEvent) {
        const state: State = e.detail.state;

        if (state.components[this.componentId]) this.question = state.components[this.componentId].question;
    }
}

window.customElements.define(PrendusCreateAssignmentDemo.is, PrendusCreateAssignmentDemo);
