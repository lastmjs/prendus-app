import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions.js';
import {GQLQuery, GQLMutate} from '../../services/graphql-service.js';
import {ContainerElement} from '../../typings/container-element.js';
import {User} from '../../typings/user.js';
import {QuestionScaffold} from '../../typings/question-scaffold.js';
import {QuestionScaffoldAnswer} from '../../typings/question-scaffold-answer.js';
import {isDefinedAndNotEmpty, getQuestionScaffoldAnswers} from '../../services/utilities-service.js';
import {createUUID} from '../../services/utilities-service.js';

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
      if(this.myIndex !== undefined && this.selectedIndex !== undefined && this.myIndex === this.selectedIndex) {
        // this.action = Actions.setDisabledNext(false);
      }
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        if (Object.keys(state.components[this.componentId] || {}).includes('loaded')) this.loaded = state.components[this.componentId].loaded;
        this.answers = this.questionScaffold ? getQuestionScaffoldAnswers(this.questionScaffold) : this.answers;
    }
}

window.customElements.define(PrendusScaffoldExample.is, PrendusScaffoldExample);
