import {ContainerElement} from '../../typings/container-element';
import {Course} from '../../typings/course';
import {SetPropertyAction, SetComponentPropertyAction, DefaultAction} from '../../typings/actions';
import {setDisabledNext, initCurrentQuestionScaffold, updateCurrentQuestionScaffold} from '../../redux/actions';
import {User} from '../../typings/user';
import {checkForUserToken, getAndSetUser} from '../../redux/actions';
import {State} from '../../typings/state';
import {QuestionScaffold} from '../../typings/question-scaffold';
import {QuestionScaffoldAnswer} from '../../typings/question-scaffold-answer';
import {isDefinedAndNotEmpty} from '../../services/utilities-service';
import {createUUID} from '../../services/utilities-service';

class PrendusScaffoldNewQuestion extends Polymer.Element implements ContainerElement {
    componentId: string;
    loaded: boolean;
    userToken: string | null;
    user: User | null;
    selectedIndex: number;
    myIndex: number;
    currentQuestionScaffold: QuestionScaffold;
    numberOfAnswers: number;
    action: SetPropertyAction | SetComponentPropertyAction | DefaultAction;

    static get is() { return 'prendus-scaffold-new-question'; }
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
            observer: 'initCurrentQuestionScaffold'
          }
        };
    }
    constructor() {
        super();
        this.componentId = createUUID();
    }
    async connectedCallback() {
        super.connectedCallback();
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: true
        };
    }

    enableNext(e:any): void{
      const question: string = this.shadowRoot.querySelector('#question') ? this.shadowRoot.querySelector('#question').value : null;
      const answer: string = this.shadowRoot.querySelector('#answer') ? this.shadowRoot.querySelector('#answer').value : null;
      if(question && answer){
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
    disableNext(e: any): void {
        if(this.myIndex !== undefined && this.selectedIndex !== undefined && this.myIndex === this.selectedIndex) {
          const question: string = this.shadowRoot.querySelector('#question') ? this.shadowRoot.querySelector('#question').value : null;
          const answer: string = this.shadowRoot.querySelector('#answer') ? this.shadowRoot.querySelector('#answer').value : null;
          const solution: string = this.shadowRoot.querySelector('#solution') ? this.shadowRoot.querySelector('#solution').value : null;
          const answers: string[] = getAnswers(this, answer);
          this.action = updateCurrentQuestionScaffold(this.currentQuestionScaffold, this.currentQuestionScaffold.concept, this.currentQuestionScaffold.resource, question, null, answers, solution)
        }

      function getAnswers(context: PrendusScaffoldNewQuestion, text: string): string[] {
        const newAnswers: { [questionScaffoldAnswerId: string]: QuestionScaffoldAnswer } = {
          ...(context.currentQuestionScaffold ? context.currentQuestionScaffold.answers : {}),
          'question0': {
            ...context.currentQuestionScaffold.answers['question0'],
            text,
            comment: 'CORRECT',
            correct: true,
            id: 'true'
          }
        };

        return Object.keys(newAnswers || {}).map((key: string, index: number) => {
          return newAnswers[key].text;
        });
      }
    }

    async stateChange(e: CustomEvent) {
        const state: State = e.detail.state;
        if (Object.keys(state.components[this.componentId] || {}).includes('loaded')) this.loaded = state.components[this.componentId].loaded;
        this.currentQuestionScaffold = state.currentQuestionScaffold;
    }
}

window.customElements.define(PrendusScaffoldNewQuestion.is, PrendusScaffoldNewQuestion);
