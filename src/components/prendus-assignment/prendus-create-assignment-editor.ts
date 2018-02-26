import {SetComponentPropertyAction} from '../../typings/actions';
import {State} from '../../typings/state';
import {fireLocalAction, createUUID} from '../../node_modules/prendus-shared/services/utilities-service';
import {createUUID, shuffleArray} from '../../services/utilities-service'; //TODO: use prendus-shared
import {compileToAssessML} from '../../node_modules/assessml/assessml';
import {AST, Content, Radio} from '../../node_modules/assessml/assessml.d';

class PrendusCreateAssignmentEditor extends Polymer.Element {
    componentId: string;
    action: SetComponentPropertyAction;
    question: {
        text: string;
        code: string;
    };

    static get is() { return 'prendus-create-assignment-editor'; }

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

window.customElements.define(PrendusCreateAssignmentEditor.is, PrendusCreateAssignmentEditor);
