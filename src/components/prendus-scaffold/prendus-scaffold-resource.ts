import {ContainerElement} from '../../typings/container-element.js';
import {Course} from '../../typings/course.js';
import {SetPropertyAction, SetComponentPropertyAction, DefaultAction} from '../../typings/actions.js';
import {updateCurrentQuestionScaffold} from '../../redux/actions.js';
import {State} from '../../typings/state.js';
import {QuestionScaffold} from '../../typings/question-scaffold.js';
import {QuestionScaffoldResource} from '../../typings/question-scaffold-resource.js';
import {createUUID} from '../../services/utilities-service.js';

class PrendusScaffoldResource extends Polymer.Element {
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction;
    loaded: boolean;
    numberOfAnswers: number;
    properties: any;
    assignmentId: string;
    myIndex: number;
    selectedIndex: number;
    currentQuestionScaffold: QuestionScaffold;

    static get is() { return 'prendus-scaffold-resource'; }
    static get properties() {
        return {
          myIndex: {
            type: Number
          },
          selectedIndex: {
            type: Number,
            observer: 'disableNext'
          }
        };
    }

    constructor() {
        super();
        this.componentId = createUUID();
    }
    connectedCallback() {
        super.connectedCallback();
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: true
        };
    }
    enableNext(): void {
      if(this.shadowRoot.querySelector('#resourceInput').value == ''){
        this.action = {
            type: 'SET_PROPERTY',
            key: 'disableNext',
            value: true
        };
      }else{
        this.action = {
            type: 'SET_PROPERTY',
            key: 'disableNext',
            value: false
        };
      }

    }
    disableNext(): void {
      if(this.myIndex !== undefined && this.selectedIndex !== undefined && this.myIndex === this.selectedIndex) {
        const resource = this.shadowRoot.querySelector('#resourceInput').value;
        this.action = updateCurrentQuestionScaffold(this.currentQuestionScaffold, this.currentQuestionScaffold.concept, resource, null, null, null);
      }
    }
    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        if (Object.keys(state.components[this.componentId] || {}).includes('loaded')) this.loaded = state.components[this.componentId].loaded;
        this.currentQuestionScaffold = state.currentQuestionScaffold;
    }

}

window.customElements.define(PrendusScaffoldResource.is, PrendusScaffoldResource);
