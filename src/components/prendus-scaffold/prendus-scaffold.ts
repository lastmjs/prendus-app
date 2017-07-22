import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {GQLQuery, GQLMutate} from '../../services/graphql-service';
import {initCurrentQuestionScaffold} from '../../redux/actions';
import {ContainerElement} from '../../typings/container-element';
import {Concept} from '../../typings/concept';
import {QuestionScaffold} from '../../typings/question-scaffold';
import {QuestionScaffoldAnswer} from '../../typings/question-scaffold-answer';
import {createUUID, navigate} from '../../services/utilities-service';

class PrendusScaffold extends Polymer.Element {
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction;
    loaded: boolean;
    userToken: string | null;
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
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'selectedIndex',
            value: 0
        };
        this.action = initCurrentQuestionScaffold(4);
    }
    back(): void {
      // this.action = Actions.setDisabledNext(false);
      this.action = {
          type: 'SET_PROPERTY',
          key: 'disableNext',
          value: false
      };
      this.action = {
          type: 'SET_COMPONENT_PROPERTY',
          componentId: this.componentId,
          key: 'selectedIndex',
          value: this.selectedIndex -1
      };
    }

    /**
     * Called when you press next
     */
    next(): void {
      const nextIndex = this.selectedIndex + 1;
      this.action = {
          type: 'SET_COMPONENT_PROPERTY',
          componentId: this.componentId,
          key: 'selectedIndex',
          value: nextIndex
      };
      this.action = {
          type: 'SET_PROPERTY',
          key: 'disableNext',
          value: true
      };
      if(this.selectedIndex === (this.shadowRoot.querySelector('#iron-pages').items.length - 2)) {
        // Reached the limit.
        this.action = {
            type: 'SET_PROPERTY',
            key: 'disableNext',
            value: false
        };

      }
      if(this.selectedIndex === (this.shadowRoot.querySelector('#iron-pages').items.length - 1)) {
        this.shadowRoot.querySelector('#next-button').style.display = 'none';
        this.shadowRoot.querySelector('#back-button').style.display = 'none';
      }
    }
    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        if (Object.keys(state.components[this.componentId] || {}).includes('loaded')) this.loaded = state.components[this.componentId].loaded;
        if (Object.keys(state.components[this.componentId] || {}).includes('selectedIndex')) this.selectedIndex = state.components[this.componentId].selectedIndex;
        this.userToken = state.userToken;
        this.disableNext = state.disableNext;
    }
}

window.customElements.define(PrendusScaffold.is, PrendusScaffold);
