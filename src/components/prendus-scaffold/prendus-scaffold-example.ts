import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {GQLQuery, GQLMutate} from '../../services/graphql-service';
import {ContainerElement} from '../../typings/container-element';
import {User} from '../../typings/user';
import {QuestionScaffold} from '../../typings/question-scaffold';
import {QuestionScaffoldAnswer} from '../../typings/question-scaffold-answer';
import {isDefinedAndNotEmpty, getQuestionScaffoldAnswers} from '../../services/utilities-service';

class PrendusScaffoldExample extends Polymer.Element {
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction;
    answers: QuestionScaffoldAnswer[];
    loaded: boolean;
    myIndex: number;
    selectedIndex: number;
    questionScaffold: QuestionScaffold;

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
            type: Object,
            observer: 'scaffoldLoaded'
          }
        };
    }
    connectedCallback() {
      console.log('connected callback in the scaffold example')
        super.connectedCallback();
        this.componentId = this.shadowRoot.querySelector('#reduxStoreElement').elementId;
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: true
        };
    }
    scaffoldLoaded(){
      console.log('scaffold has loaded')
    }
    disableNext(): void {
      if(this.myIndex !== undefined && this.selectedIndex !== undefined && this.myIndex === this.selectedIndex) {
        this.action = Actions.setDisabledNext(false);
      }
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        this.loaded = state.components[this.componentId] ? state.components[this.componentId].loaded : this.loaded;
        this.answers = this.questionScaffold ? getQuestionScaffoldAnswers(this.questionScaffold) : this.answers;
    }
}

window.customElements.define(PrendusScaffoldExample.is, PrendusScaffoldExample);
