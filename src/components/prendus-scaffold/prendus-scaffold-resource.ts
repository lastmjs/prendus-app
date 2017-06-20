import {ContainerElement} from '../../typings/container-element';
import {Course} from '../../typings/course';
import {SetPropertyAction, SetComponentPropertyAction, DefaultAction} from '../../typings/actions';
import {State} from '../../typings/state';
import {QuestionScaffoldResource} from '../../typings/question-scaffold-resource';
import {createUUID} from '../../services/utilities-service';

class PrendusApp extends Polymer.Element {
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction;
    loaded: boolean;
    numberOfAnswers: number;
    properties: any;
    assignmentId: string;

    static get is() { return 'prendus-scaffold-resource'; }
    constructor() {
        super();
        this.componentId = createUUID();
    }
    connectedCallback() {
        super.connectedCallback();
    }
    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        this.loaded = state.components[this.componentId] ? state.components[this.componentId].loaded : this.loaded;
    }
}

window.customElements.define(PrendusScaffoldResource.is, PrendusScaffoldResource);
