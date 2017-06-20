import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {GQLQuery, GQLMutate} from '../../services/graphql-service';
import {initCurrentQuestionScaffold} from '../../redux/actions';
import {ContainerElement} from '../../typings/container-element';
import {Concept} from '../../typings/concept';
import {User} from '../../typings/user';
import {QuestionScaffold} from '../../typings/question-scaffold';
import {QuestionScaffoldAnswer} from '../../typings/question-scaffold-answer';
import {createUUID} from '../../services/utilities-service';

class PrendusScaffold extends Polymer.Element {
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction;
    loaded: boolean;
    userToken: string | null;
    user: User | null;
    selectedIndex: number;
    disableNext: boolean;
    numberOfAnswers: number;
    exampleQuestionScaffold: QuestionScaffold;
    exampleQuestionScaffoldAnswers: QuestionScaffoldAnswer[];
    questionScaffold: QuestionScaffold;
    questionScaffoldAnswers: QuestionScaffoldAnswer[];
    questionScaffoldsToRate: QuestionScaffold[];
    questionScaffoldQuizId: string;
    assignmentId: string;
    concepts: Concept[];


    static get is() { return 'prendus-scaffold'; }
    static get properties() {
      return {
        concepts: {
        },
        assignmentId: {
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
        this.selectedIndex = 0;
        this.action = initCurrentQuestionScaffold(4);
    }
    back(): void {
      --this.selectedIndex;
      // this.action = Actions.setDisabledNext(false);
      this.action = {
          type: 'SET_COMPONENT_PROPERTY',
          componentId: this.componentId,
          key: 'setDisabledNext',
          value: false
      };
    }

    /**
     * Called when you press next
     */
    next(): void {
      ++this.selectedIndex;
      if(this.selectedIndex === this.shadowRoot.querySelector('#iron-pages').items.length - 1) {
        // Reached the limit.
        //this.action = Actions.setDisabledNext(true);
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'setDisabledNext',
            value: true
        };
      }
    }
    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        if (Object.keys(state.components[this.componentId] || {}).includes('loaded')) this.loaded = state.components[this.componentId].loaded;
        this.userToken = state.userToken;
        this.user = state.user;
        this.disableNext = state.disableNext;
    }
}

window.customElements.define(PrendusScaffold.is, PrendusScaffold);
