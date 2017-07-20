import {ContainerElement} from '../../typings/container-element.js';
import {User} from '../../typings/user.js';
import {SetPropertyAction, SetComponentPropertyAction, DefaultAction} from '../../typings/actions.js';
import {setDisabledNext, initCurrentQuestionScaffold, updateCurrentQuestionScaffold} from '../../redux/actions.js';
import {QuestionScaffold} from '../../typings/question-scaffold.js';
import {QuestionScaffoldAnswer} from '../../typings/question-scaffold-answer.js';
import {isDefinedAndNotEmpty, getQuestionScaffoldAnswers} from '../../services/utilities-service.js';
import {createUUID} from '../../services/utilities-service.js';

class PrendusScaffoldComments extends Polymer.Element {
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction;
    loaded: boolean;
    userToken: string | null;
    user: User | null;
    selectedIndex: number;
    numberOfAnswers: number;
    assignmentId: string;
    answers: QuestionScaffoldAnswer[];
    myIndex: number;
    currentQuestionScaffold: QuestionScaffold;

    static get is() { return 'prendus-scaffold-comments'; }
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
      const comments: string[] = this.getComments(this);
      if(isDefinedAndNotEmpty(comments)){
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
        const comments: string[] = this.getComments(this);
        this.action = setDisabledNext(!isDefinedAndNotEmpty(comments));
        this.action = updateCurrentQuestionScaffold(this.currentQuestionScaffold, this.currentQuestionScaffold.concept, this.currentQuestionScaffold.resource, null, comments, null, null);
      }
    }
    getComments(context: PrendusScaffoldComments): string[] {
      return Object.keys(context.currentQuestionScaffold ? context.currentQuestionScaffold.answers : {}).map((key: string, index: number) => {
        return context.shadowRoot.querySelector(`#comment${index}`) ? context.shadowRoot.querySelector(`#comment${index}`).value : null;
      });
    }
    plusOne(index: number): number {
      return index + 1;
    }


    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        if (Object.keys(state.components[this.componentId] || {}).includes('loaded')) this.loaded = state.components[this.componentId].loaded;
        this.currentQuestionScaffold = state.currentQuestionScaffold;
        this.answers = state.currentQuestionScaffold ? getQuestionScaffoldAnswers(state.currentQuestionScaffold) : this.answers;
    }
}

window.customElements.define(PrendusScaffoldComments.is, PrendusScaffoldComments);
