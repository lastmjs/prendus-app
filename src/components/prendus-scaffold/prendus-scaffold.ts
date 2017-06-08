import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {GQLQuery, GQLMutate} from '../../services/graphql-service';
import {ContainerElement} from '../../typings/container-element';
import {User} from '../../typings/user';

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


    static get is() { return 'prendus-scaffold'; }

    connectedCallback() {
        super.connectedCallback();
        this.componentId = this.shadowRoot.querySelector('#reduxStoreElement').elementId;
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: true
        };
        this.selectedIndex = 0;
        this.numberOfAnswers = 4;
    }
    back(): void {
      console.log('selected index back', this.selectedIndex)
      --this.selectedIndex;
      this.action = Actions.setDisabledNext(false);
    }

    /**
     * Called when you press next
     */
    next(): void {
      ++this.selectedIndex;
      console.log('selected index next', this.selectedIndex)
      if(this.selectedIndex === this.shadowRoot.querySelector('#iron-pages').items.length - 1) {
        // Reached the limit.
        this.action = Actions.setDisabledNext(true);
      }
    }
    stateChange(e: CustomEvent) {
        const state = e.detail.state;

        this.loaded = state.components[this.componentId] ? state.components[this.componentId].loaded : this.loaded;
        this.userToken = state.userToken;
        this.user = state.user;
    }
}

window.customElements.define(PrendusScaffold.is, PrendusScaffold);
