import {GQLQuery, GQLMutate, GQLSubscribe} from '../../services/graphql-service';
import {SetComponentPropertyAction} from '../../typings/actions';
import {Question} from '../../typings/question';
import {BuiltQuestion} from '../../typings/built-question';
import {buildQuestion} from '../../services/build-question-service';

class PrendusViewQuestion extends Polymer.Element {
    componentId: string;
    action: SetComponentPropertyAction;
    questionId: string;
    question: Question;
    builtQuestion: BuiltQuestion;
    userToken: string | null;
    loaded: boolean;

    static get is() { return 'prendus-view-question'; }
    static get properties() {
        return {
            question: {
                type: Object
            },
            questionId: {
                type: String,
                observer: 'questionIdChanged'
            }

        };
    }

    async connectedCallback() {
        super.connectedCallback();

        //always set the componentId before firing other actions within a component
        this.componentId = this.shadowRoot.querySelector('#reduxStoreElement').elementId;

        // this.action = checkForUserToken();
        // this.action = await getAndSetUser();
    }

    async questionIdChanged() {
        //TODO should I check to see if questionId is defined?

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'questionId',
            value: this.questionId
        };

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: false
        };

        await this.loadData();

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: true
        };
    }

    async loadData() {
        await GQLQuery(`
            query {
                question: Question(id: "${this.questionId}") {
                    text
                    code
                }
            }
        `, this.userToken, (key: string, value: any) => {
            this.action = {
                type: 'SET_COMPONENT_PROPERTY',
                componentId: this.componentId,
                key,
                value
            };
        }, (error: any) => {
            console.log(error);
        });

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'builtQuestion',
            value: await buildQuestion(this.question)
        };
    }

    checkAnswer() {
        alert('check answer')
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        const componentState = state.components[this.componentId];

        this.userToken = state.userToken;
        this.question = componentState ? componentState.question : this.question;
        this.builtQuestion = componentState ? componentState.builtQuestion : this.builtQuestion;
        this.loaded = componentState ? componentState.loaded : this.loaded;
    }
}

window.customElements.define(PrendusViewQuestion.is, PrendusViewQuestion);
