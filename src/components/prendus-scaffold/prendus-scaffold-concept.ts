import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {GQLQuery, GQLMutate} from '../../services/graphql-service';
import {ContainerElement} from '../../typings/container-element';
import {QuestionScaffold} from '../../typings/question-scaffold';
import {User} from '../../typings/user';

class PrendusScaffoldComments extends Polymer.Element {
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

    static get is() { return 'prendus-scaffold-comments'; }
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
    connectedCallback() {
        super.connectedCallback();
        this.componentId = this.shadowRoot.querySelector('#reduxStoreElement').elementId;
        // this.action = {
        //     type: 'SET_COMPONENT_PROPERTY',
        //     componentId: this.componentId,
        //     key: 'loaded',
        //     value: true
        // };
        this.loadConcepts();
    }

    disableNext(): void {
      try {
        if(this.myIndex !== undefined && this.selectedIndex !== undefined && this.myIndex === this.selectedIndex) {
          const concepts: string[] = getConcepts(this);
          // this.action = Actions.setDisabledNext(!UtilitiesService.isDefinedAndNotEmpty(comments));
          // this.action = Actions.updateCurrentQuestionScaffold(null, comments, null, null);
        }
      } catch(error) {
        console.error(error);
      }
    }
    loadConcepts(){
      console.log('load concepts')
    }
    plusOne(index: number): number {
      return index + 1;
    }


    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        this.loaded = state.components[this.componentId] ? state.components[this.componentId].loaded : this.loaded;
    }
}

window.customElements.define(PrendusScaffoldComments.is, PrendusScaffoldComments);
