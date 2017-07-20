import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions.js';
import {GQLQuery, GQLMutate} from '../../services/graphql-service.js';
import {setDisabledNext, initCurrentQuestionScaffold, updateCurrentQuestionScaffold} from '../../redux/actions.js';
import {QuestionScaffold} from '../../typings/question-scaffold.js';
import {QuestionScaffoldAnswer} from '../../typings/question-scaffold-answer.js';
import {isDefinedAndNotEmpty, getQuestionScaffoldAnswers} from '../../services/utilities-service.js';
import {createUUID} from '../../services/utilities-service.js';

class PrendusScaffoldExplanation extends Polymer.Element {
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction;
    loaded: boolean;
    selectedIndex: number;
    numberOfAnswers: number;
    myIndex: number;
    currentQuestionScaffold: QuestionScaffold;
    answers: QuestionScaffoldAnswer[];

    static get is() { return 'prendus-scaffold-explanation'; }
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
    enableNext(){
      if(isDefinedAndNotEmpty(this.shadowRoot.querySelector('#explanation') ? this.shadowRoot.querySelector('#explanation').value : null)){
        this.action = {
            type: 'SET_PROPERTY',
            key: 'disableNext',
            value: false
        };
      }else{
        this.action = {
            type: 'SET_PROPERTY',
            key: 'disableNext',
            value: true
        };
      }
    }
    disableNext(): void {
      if(this.myIndex !== undefined && this.selectedIndex !== undefined && this.myIndex === this.selectedIndex) {
        this.action = updateCurrentQuestionScaffold(this.currentQuestionScaffold, this.currentQuestionScaffold.concept, this.currentQuestionScaffold.resource, null, null, null, this.shadowRoot.querySelector('#explanation') ? this.shadowRoot.querySelector('#explanation').value : null);
      }
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        if (Object.keys(state.components[this.componentId] || {}).includes('loaded')) this.loaded = state.components[this.componentId].loaded;
        this.currentQuestionScaffold = state.currentQuestionScaffold;
        this.answers = state.currentQuestionScaffold ? getQuestionScaffoldAnswers(state.currentQuestionScaffold) : this.answers;
    }
}

window.customElements.define(PrendusScaffoldExplanation.is, PrendusScaffoldExplanation);
