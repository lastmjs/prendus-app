import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {GQLQuery, GQLMutate} from '../../services/graphql-service';
import {ContainerElement} from '../../typings/container-element';
import {User} from '../../typings/user';

class PrendusScaffoldDistractors extends Polymer.Element {
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction;
    loaded: boolean;
    userToken: string | null;
    user: User | null;
    selectedIndex: number;
    disableNext: boolean;
    numberOfAnswers: number;
    properties: any;
    assignmentId: string;


    static get is() { return 'prendus-scaffold-distractors'; }

    connectedCallback() {
        super.connectedCallback();
        this.componentId = this.shadowRoot.querySelector('#reduxStoreElement').elementId;
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: true
        };
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
          this.action = Actions.setDisabledNext(!UtilitiesService.isDefinedAndNotEmpty(distractors));
          this.action = Actions.updateCurrentQuestionScaffold(null, null, distractors, null);
        }

      } catch(error) {
        console.error(error);
      }

      function getDistractors(context: PrendusQuestionScaffoldDistractors): string[] {
        return Object.keys(context.currentQuestionScaffold ? context.currentQuestionScaffold.answers : {}).map((key: string, index: number) => {
          const id: string = `#distractor${index}`;
          return context.querySelector(id) ? context.querySelector(id).value : null;
        });
      }
    }
    
    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        this.loaded = state.components[this.componentId] ? state.components[this.componentId].loaded : this.loaded;
        this.userToken = state.userToken;
        this.user = state.user;
    }
}

window.customElements.define(PrendusScaffoldDistractors.is, PrendusScaffoldDistractors);
