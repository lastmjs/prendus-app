import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions.js';
import {GQLQuery, GQLMutate} from '../../services/graphql-service.js';
import {setDisabledNext, initCurrentQuestionScaffold, updateCurrentQuestionScaffold} from '../../redux/actions.js';
import {QuestionScaffold} from '../../typings/question-scaffold.js';
import {QuestionScaffoldAnswer} from '../../typings/question-scaffold-answer.js';
import {isDefinedAndNotEmpty} from '../../services/utilities-service.js';
import {ContainerElement} from '../../typings/container-element.js';
import {createUUID} from '../../services/utilities-service.js';

class PrendusScaffoldDistractors extends Polymer.Element {
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction;
    loaded: boolean;
    selectedIndex: number;
    numberOfAnswers: number;
    currentQuestionScaffold: QuestionScaffold;
    distractors: any[];
    answer: string;
    myIndex: number;

    static get is() { return 'prendus-scaffold-distractors'; }

    static get properties() {
        return {
          selectedIndex: {
            type: Number,
            observer: 'disableNext'
          },
          myIndex: {
            type: Number
          },
          numberOfAnswers: {
            type: Number,
            observer: 'numberOfAnswersSet'
          },
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
            key: 'distractors',
            value: Array(3)
        };
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: true
        };
    }
    enableNext(){
      const distractors: string[] = this.getDistractors(this);
      if(isDefinedAndNotEmpty(distractors)){
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
        const distractors: string[] = this.getDistractors(this);
        this.action = updateCurrentQuestionScaffold(this.currentQuestionScaffold, this.currentQuestionScaffold.concept, this.currentQuestionScaffold.resource, null, null, distractors, null);
      }
    }
    getDistractors(context: PrendusScaffoldDistractors): string[] {
      return Object.keys(context.currentQuestionScaffold ? context.currentQuestionScaffold.answers : {}).map((key: string, index: number) => {
        const id: string = `#distractor${index}`;
        return context.shadowRoot.querySelector(id) ? context.shadowRoot.querySelector(id).value : null;
      });
    }
    plusOne(index: number): number {
      return index + 1;
    }
    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        if (Object.keys(state.components[this.componentId] || {}).includes('loaded')) this.loaded = state.components[this.componentId].loaded;
        if (Object.keys(state.components[this.componentId] || {}).includes('distractors')) this.distractors = state.components[this.componentId].distractors;
        this.loaded = state.components[this.componentId] ? state.components[this.componentId].loaded : this.loaded;
        this.currentQuestionScaffold = state.currentQuestionScaffold;
        this.answer = state.currentQuestionScaffold && state.currentQuestionScaffold.answers && state.currentQuestionScaffold.answers['question0'] ? state.currentQuestionScaffold.answers['question0'].text : this.answer;
    }
}

window.customElements.define(PrendusScaffoldDistractors.is, PrendusScaffoldDistractors);
