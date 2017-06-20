import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {GQLQuery, GQLMutate} from '../../services/graphql-service';
import {setDisabledNext, initCurrentQuestionScaffold, updateCurrentQuestionScaffold} from '../../redux/actions';
import {QuestionScaffold} from '../../typings/question-scaffold';
import {QuestionScaffoldAnswer} from '../../typings/question-scaffold-answer';
import {isDefinedAndNotEmpty, getQuestionScaffoldAnswers} from '../../services/utilities-service';
import {createUUID} from '../../services/utilities-service';

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
    }

    disableNext(): void {
      try {
        if(this.myIndex !== undefined && this.selectedIndex !== undefined && this.myIndex === this.selectedIndex) {
          this.action = setDisabledNext(isDefinedAndNotEmpty(this.shadowRoot.querySelector('#explanation') ? this.shadowRoot.querySelector('#explanation').value : null));
          this.action = updateCurrentQuestionScaffold(this.currentQuestionScaffold, null, null, null, this.shadowRoot.querySelector('#explanation') ? this.shadowRoot.querySelector('#explanation').value : null);
        }
      } catch(error) {
        console.error(error);
      }
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        this.loaded = state.components[this.componentId] ? state.components[this.componentId].loaded : this.loaded;
        this.currentQuestionScaffold = state.currentQuestionScaffold;
        this.answers = state.currentQuestionScaffold ? getQuestionScaffoldAnswers(state.currentQuestionScaffold) : this.answers;
    }
}

window.customElements.define(PrendusScaffoldExplanation.is, PrendusScaffoldExplanation);
