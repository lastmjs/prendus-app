import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {GQLQuery, GQLMutate} from '../../services/graphql-service';
import {ContainerElement} from '../../typings/container-element';
import {User} from '../../typings/user';

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

    disableNext(): void {
      try {
        if(this.myIndex !== undefined && this.selectedIndex !== undefined && this.myIndex === this.selectedIndex) {
          this.action = Actions.setDisabledNext(!UtilitiesService.isDefinedAndNotEmpty(this.querySelector('#explanation') ? this.querySelector('#explanation').value : null));
          this.action = Actions.updateCurrentQuestionScaffold(null, null, null, this.querySelector('#explanation') ? this.querySelector('#explanation').value : null);
        }
      } catch(error) {
        console.error(error);
      }
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        this.loaded = state.components[this.componentId] ? state.components[this.componentId].loaded : this.loaded;
    }
}

window.customElements.define(PrendusScaffoldExplanation.is, PrendusScaffoldExplanation);
