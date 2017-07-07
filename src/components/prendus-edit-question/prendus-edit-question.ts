import {createUUID} from '../../services/utilities-service';
import {RawQuestion} from '../../typings/raw-question';
import {SetComponentPropertyAction} from '../../typings/actions';

class PrendusEditQuestion extends Polymer.Element {
    componentId: string;
    previewQuestion: RawQuestion;
    action: SetComponentPropertyAction;

    static get is() { return 'prendus-edit-question'; }

    constructor() {
        super();

        this.componentId = createUUID();
    }

    connectedCallback() {
        super.connectedCallback();

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'previewQuestion',
            value: {
                text: '',
                code: ''
            }
        };
    }

    textTextareaInput() {
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'previewQuestion',
            value: {
                ...this.previewQuestion,
                text: this.shadowRoot.querySelector('#textTextarea').value
            }
        };
    }

    codeTextareaInput() {
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'previewQuestion',
            value: {
                ...this.previewQuestion,
                code: this.shadowRoot.querySelector('#codeTextarea').value
            }
        };
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;

        if (Object.keys(state.components[this.componentId] || {}).includes('previewQuestion')) this.previewQuestion = state.components[this.componentId].previewQuestion;
    }
}

window.customElements.define(PrendusEditQuestion.is, PrendusEditQuestion);
