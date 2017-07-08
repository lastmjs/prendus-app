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
    selected: number;

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
            key: 'selected',
            value: 0
        };

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: true
        };

        setTimeout(() => { //TODO fix this...it would be nice to be able to set the font-size officially through the ace editor web component, and then we wouldn't have to hack. The timeout is to ensure the current task on the event loop completes and the dom template is stamped because of the loaded property before accessing the dom
            this.shadowRoot.querySelector('#codeEditor').shadowRoot.querySelector('#juicy-ace-editor-container').style = 'font-size: calc(40px - 1vw)';
        }, 1000);
    }

    textEditorChanged() {
        if (!this.shadowRoot.querySelector('#textEditor')) {
            return;
        }

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'question',
            value: {
                ...this.question,
                text: this.shadowRoot.querySelector('#textEditor').value,
                code: this.question ? this.question.code : ''
            }
        };
    }

    codeEditorChanged() {
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'question',
            value: {
                ...this.question,
                text: this.question ? this.question.text : '',
                code: this.shadowRoot.querySelector('#codeEditor').value
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

    selectedChanged(e: CustomEvent) {
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'selected',
            value: e.detail.value
        };
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;

        if (Object.keys(state.components[this.componentId] || {}).includes('loaded')) this.loaded = state.components[this.componentId].loaded;
        if (Object.keys(state.components[this.componentId] || {}).includes('question')) this.question = state.components[this.componentId].question;
        if (Object.keys(state.components[this.componentId] || {}).includes('questionId')) this.questionId = state.components[this.componentId].questionId;
        if (Object.keys(state.components[this.componentId] || {}).includes('selected')) this.selected = state.components[this.componentId].selected;

        this.userToken = state.userToken;
        this.user = state.user
    }
}

window.customElements.define(PrendusEditQuestion.is, PrendusEditQuestion);
