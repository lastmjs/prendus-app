import {GQLQuery, GQLMutate, GQLSubscribe} from '../../services/graphql-service.js';
import {ContainerElement} from '../../typings/container-element.js';
import {Mode} from '../../typings/mode.js';
import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions.js';
import {Concept} from '../../typings/concept.js';
import {User} from '../../typings/user.js';
import {createUUID} from '../../services/utilities-service.js';

class PrendusConcept extends Polymer.Element implements ContainerElement {
    conceptId: string;
    concept: Concept;
    subjectId: string;
    mode: Mode;
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction;
    loaded: boolean;
    userToken: string;
    user: User;

    static get is() { return 'prendus-concept'; }
    static get properties() {
        return {
            conceptId: {
                observer: 'conceptIdChanged'
            },
            subjectId: {
              type: String,
            },
            mode: {

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

    isViewMode(mode: Mode) {
        return mode === 'view';
    }

    isEditMode(mode: Mode) {
        return mode === 'edit';
    }

    isCreateMode(mode: Mode) {
        return mode === 'create';
    }

    async conceptIdChanged() {
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'conceptId',
            value: this.conceptId
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
                concept${this.conceptId}: Concept(id: "${this.conceptId}") {
                    title
                    subject {
                        id
                    }
                }
            }
        `, this.userToken, (key: string, value: any) => {
            this.action = {
                type: 'SET_PROPERTY',
                key,
                value
            };
        }, (error: any) => {
            alert(error);
        });
    }

    async saveConcept() {
        const title = this.shadowRoot.querySelector('#titleInput').value;
        if (this.conceptId) {
            GQLMutate(`
                mutation {
                    updateConcept(
                        id: "${this.conceptId}"
                        title: "${title}"
                        subjectId: "${this.subjectId}"
                    ) {
                        id
                    }
                }
            `, this.userToken, (error: any) => {
                alert(error);
            });
        }
        else {
            const data = await GQLMutate(`
                mutation {
                    createConcept(
                        title: "${title}"
                        subjectId: "${this.subjectId}"
                    ) {
                        id
                    }
                }
            `, this.userToken, (error: any) => {
              console.log('error', error)
                alert(error);
            });
            this.action = {
                type: 'SET_COMPONENT_PROPERTY',
                componentId: this.componentId,
                key: 'conceptId',
                value: data.createConcept.id
            };
        }
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        this.conceptId = state.components[this.componentId] ? state.components[this.componentId].conceptId : this.conceptId;
        this.concept = state[`concept${this.conceptId}`];
        this.subjectId = this.concept ? this.concept.subject.id : this.subjectId;
        this.loaded = state.components[this.componentId] ? state.components[this.componentId].loaded : this.loaded;
        this.userToken = state.userToken;
        this.user = state.user;
    }
}

window.customElements.define(PrendusConcept.is, PrendusConcept);
