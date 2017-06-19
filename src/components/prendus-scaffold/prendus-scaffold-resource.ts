import {ContainerElement} from '../../typings/container-element';
import {Course} from '../../typings/course';
import {SetPropertyAction, SetComponentPropertyAction, DefaultAction} from '../../typings/actions';
import {updateCurrentQuestionScaffold} from '../../redux/actions';
import {State} from '../../typings/state';
import {QuestionScaffold} from '../../typings/question-scaffold';
import {QuestionScaffoldResource} from '../../typings/question-scaffold-resource';
import {createUUID} from '../../services/utilities-service';

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
    disableNext(): void {
      try {
        if(this.myIndex !== undefined && this.selectedIndex !== undefined && this.myIndex === this.selectedIndex) {
          const resource = this.shadowRoot.querySelector('#resourceInput').value;
          this.action = updateCurrentQuestionScaffold(this.currentQuestionScaffold, this.currentQuestionScaffold.concept, resource, null, null, null);
        }
      } catch(error) {
        console.error(error);
      }
    }
    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        if (Object.keys(state.components[this.componentId] || {}).includes('loaded')) this.loaded = state.components[this.componentId].loaded;
        this.currentQuestionScaffold = state.currentQuestionScaffold;
    }

}

window.customElements.define(PrendusScaffoldResource.is, PrendusScaffoldResource);
