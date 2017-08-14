import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {updateCurrentQuestionScaffold} from '../../redux/actions';
import {GQLQuery, GQLMutate} from '../../services/graphql-service';
import {ContainerElement} from '../../typings/container-element';
import {QuestionScaffold} from '../../typings/question-scaffold';
import {User} from '../../typings/user';
import {Concept} from '../../typings/concept';
import {createUUID} from '../../services/utilities-service';

class PrendusScaffoldConcept extends Polymer.Element {
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction;
    loaded: boolean;
    userToken: string | null;
    user: User | null;
    selectedIndex: number;
    numberOfAnswers: number;
    properties: any;
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
    enableNext(){
      const concept: string = this.shadowRoot.querySelector('#concept-input').value;
      if(concept){
        this.action = {
            type: 'SET_PROPERTY',
            key: 'disableNext',
            value: false
        };
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'selectedConcept',
            value: concept
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
      console.log('concepts', this.concepts)
      try {
        if(this.myIndex !== undefined && this.selectedIndex !== undefined && this.myIndex === this.selectedIndex) {
          // const concepts: string[] = getConcepts(this);
          // this.action = Actions.setDisabledNext(!UtilitiesService.isDefinedAndNotEmpty(comments));
          //If the concept is a new concept, wait until the question is submitted to create it
          console.log('selectedConcept', this.selectedConcept)
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
