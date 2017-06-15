import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {GQLQuery, GQLMutate} from '../../services/graphql-service';
import {setDisabledNext, initCurrentQuestionScaffold, updateCurrentQuestionScaffold} from '../../redux/actions';
import {QuestionScaffold} from '../../typings/question-scaffold';
import {QuestionScaffoldAnswer} from '../../typings/question-scaffold-answer';
import {isDefinedAndNotEmpty} from '../../services/utilities-service';
import {ContainerElement} from '../../typings/container-element';

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
    connectedCallback() {
        super.connectedCallback();
        this.componentId = this.shadowRoot.querySelector('#reduxStoreElement').elementId;
        // this.action = {
        //     type: 'SET_COMPONENT_PROPERTY',
        //     componentId: this.componentId,
        //     key: 'loaded',
        //     value: true
        // };
    }
    /**
     * Called when numberOfAnswers is set.
     */
    numberOfAnswersSet(): void {
      // - 1 because there are numberOfAnswers - 1 amount of distractors.
      // This array determines how many distractors will be in the html
      this.distractors = Array(this.numberOfAnswers - 1);
    }

    disableNext(): void {
      try {
        if(this.myIndex !== undefined && this.selectedIndex !== undefined && this.myIndex === this.selectedIndex) {
          const distractors: string[] = getDistractors(this);
          this.action = setDisabledNext(!isDefinedAndNotEmpty(distractors));
          this.action = updateCurrentQuestionScaffold(this.currentQuestionScaffold, null, null, distractors, null);
        }

      } catch(error) {
        console.error(error);
      }

      function getDistractors(context: PrendusScaffoldDistractors): string[] {
        return Object.keys(context.currentQuestionScaffold ? context.currentQuestionScaffold.answers : {}).map((key: string, index: number) => {
          const id: string = `#distractor${index}`;
          return context.shadowRoot.querySelector(id) ? context.shadowRoot.querySelector(id).value : null;
        });
      }
    }
    plusOne(index: number): number {
      return index + 1;
    }
    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        this.loaded = state.components[this.componentId] ? state.components[this.componentId].loaded : this.loaded;
        this.currentQuestionScaffold = state.currentQuestionScaffold;
        this.answer = state.currentQuestionScaffold && state.currentQuestionScaffold.answers && state.currentQuestionScaffold.answers['question0'] ? state.currentQuestionScaffold.answers['question0'].text : this.answer;
    }
}

window.customElements.define(PrendusScaffoldDistractors.is, PrendusScaffoldDistractors);
