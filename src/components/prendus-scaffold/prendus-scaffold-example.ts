import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {GQLQuery, GQLMutate} from '../../services/graphql-service';
import {ContainerElement} from '../../typings/container-element';
import {User} from '../../typings/user';

class PrendusScaffoldExample extends Polymer.Element {
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction;
    loaded: boolean;

    static get is() { return 'prendus-scaffold-example'; }
    static get properties() {
        return {
          selectedIndex: {
            type: Number,
            observer: 'disableNext'
          },
          myIndex: {
            type: Number
          },
          questionScaffold: {
            type: Object
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
      if(this.myIndex !== undefined && this.selectedIndex !== undefined && this.myIndex === this.selectedIndex) {
        this.action = Actions.setDisabledNext(false);
      }
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        this.loaded = state.components[this.componentId] ? state.components[this.componentId].loaded : this.loaded;
        this.answers = this.questionScaffold ? UtilitiesService.getQuestionScaffoldAnswers(this.questionScaffold) : this.answers;
    }
}

window.customElements.define(PrendusScaffoldExample.is, PrendusScaffoldExample);
