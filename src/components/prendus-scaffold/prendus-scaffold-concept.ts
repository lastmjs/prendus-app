import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions.js';
import {updateCurrentQuestionScaffold} from '../../redux/actions.js';
import {GQLQuery, GQLMutate} from '../../services/graphql-service.js';
import {ContainerElement} from '../../typings/container-element.js';
import {QuestionScaffold} from '../../typings/question-scaffold.js';
import {User} from '../../typings/user.js';
import {Concept} from '../../typings/concept.js';
import {createUUID} from '../../services/utilities-service.js';

class PrendusScaffoldConcept extends Polymer.Element {
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction;
    loaded: boolean;
    userToken: string | null;
    user: User | null;
    selectedIndex: number;
    numberOfAnswers: number;
    properties: any;
    assignmentId: string;
    myIndex: number;
    currentQuestionScaffold: QuestionScaffold;
    concepts: Concept[]
    selectedConcept: Concept

    static get is() { return 'prendus-scaffold-concept'; }
    static get properties() {
        return {
          myIndex: {
            type: Number
          },
          selectedIndex: {
            type: Number,
            observer: 'disableNext'
          },
          concepts: {
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
          // const concepts: string[] = getConcepts(this);
          // this.action = Actions.setDisabledNext(!UtilitiesService.isDefinedAndNotEmpty(comments));
          this.action = updateCurrentQuestionScaffold(this.currentQuestionScaffold, this.selectedConcept, null, null, null, null, null);
        }
      } catch(error) {
        console.error(error);
      }
    }
    plusOne(index: number): number {
      return index + 1;
    }
    saveConcept(e){
      this.action = {
          type: 'SET_COMPONENT_PROPERTY',
          componentId: this.componentId,
          key: 'selectedConcept',
          value: this.concepts[e.target.id]
      };
      this.action = {
          type: 'SET_PROPERTY',
          key: 'disableNext',
          value: false
      };
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        if (Object.keys(state.components[this.componentId] || {}).includes('loaded')) this.loaded = state.components[this.componentId].loaded;
        if (Object.keys(state.components[this.componentId] || {}).includes('selectedConcept')) this.selectedConcept = state.components[this.componentId].selectedConcept;
        this.currentQuestionScaffold = state.currentQuestionScaffold;
    }
}

window.customElements.define(PrendusScaffoldConcept.is, PrendusScaffoldConcept);
