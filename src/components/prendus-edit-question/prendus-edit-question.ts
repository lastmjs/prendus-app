import {createUUID, navigate} from '../../services/utilities-service';
import {Question} from '../../typings/question';
import {SetComponentPropertyAction} from '../../typings/actions';
import {GQLMutate, GQLQuery, escapeString} from '../../services/graphql-service';
import {User} from '../../typings/user';

class PrendusEditQuestion extends Polymer.Element {
    componentId: string;
    question: Question;
    questionId: string;
    action: SetComponentPropertyAction;
    userToken: string;
    user: User;
    loaded: boolean;

    static get is() { return 'prendus-edit-question'; }
    static get properties() {
        return {
            question: {
                type: Object,
                observer: 'questionChanged'
            },
            questionId: {
                type: String,
                observer: 'questionIdChanged'
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

    textTextareaInput() {
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'question',
            value: {
                ...this.question,
                text: this.shadowRoot.querySelector('#textTextarea').value,
                code: this.question ? this.question.code : ''
            }
        };
    }

    codeTextareaInput() {
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'question',
            value: {
                ...this.question,
                text: this.question ? this.question.text : '',
                code: this.shadowRoot.querySelector('#codeTextarea').value
            }
        };
    }

    async questionChanged() {
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'question',
            value: this.question
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

        //this is so that if the question is being viewed from within an iframe, the iframe can resize itself
        window.parent.postMessage({
            type: 'prendus-edit-question-resize',
            height: document.body.scrollHeight,
            width: document.body.scrollWidth
        }, '*');
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
        if (!this.question || this.question.id !== this.questionId) {
            await GQLQuery(`
                query {
                    question: Question(id: "${this.questionId}") {
                        id
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
        }
    }

    async save() {
        if (!this.questionId) {
            const data = await GQLMutate(`
                mutation {
                    createQuestion(
                        authorId: "${escapeString(this.user.id)}"
                        text: "${escapeString(this.question.text)}"
                        code: "${escapeString(this.question.code)}"
                    ) {
                        id
                    }
                }
            `, this.userToken, (error: any) => {
                console.log(error);
            });

            navigate(`/question/${data.createQuestion.id}/edit`);
        }
        else {
            GQLMutate(`
                mutation {
                    updateQuestion(
                        id: "${escapeString(this.questionId)}"
                        text: "${escapeString(this.question.text)}"
                        code: "${escapeString(this.question.code)}"
                    ) {
                        id
                    }
                }
            `, this.userToken, (error: any) => {
                console.log(error);
            });
        }
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;

        if (Object.keys(state.components[this.componentId] || {}).includes('loaded')) this.loaded = state.components[this.componentId].loaded;
        if (Object.keys(state.components[this.componentId] || {}).includes('question')) this.question = state.components[this.componentId].question;
        if (Object.keys(state.components[this.componentId] || {}).includes('questionId')) this.questionId = state.components[this.componentId].questionId;

        this.userToken = state.userToken;
        this.user = state.user;
    }
}

window.customElements.define(PrendusEditQuestion.is, PrendusEditQuestion);
