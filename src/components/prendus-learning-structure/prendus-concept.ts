import {GQLRequest, GQLSubscribe} from '../../node_modules/prendus-shared/services/graphql-service';
import {ContainerElement} from '../../typings/container-element';
import {Mode} from '../../typings/mode';
import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {setNotification} from '../../redux/actions';
import {Concept} from '../../typings/concept';
import {User} from '../../typings/user';
import {createUUID} from '../../node_modules/prendus-shared/services/utilities-service';
import {NotificationType} from '../../services/constants-service';

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
        const conceptKey = `concept${this.conceptId}`;
        const data = await GQLRequest(`
            query concept($conceptId: ID!) {
                ${conceptKey}: Concept(id: $conceptId) {
                    title
                    subject {
                        id
                    }
                }
            }
        `, {conceptId: this.conceptId}, this.userToken, (error: any) => {
            this.action = setNotification(error.message, NotificationType.ERROR)
        });
        this.action = {
            type: 'SET_PROPERTY',
            conceptKey,
            data[conceptKey]
        };
    }

    async saveConcept() {
        const title = this.shadowRoot.querySelector('#titleInput').value;
        if (this.conceptId) {
            GQLRequest(`
                mutation conceptUpdate($conceptId: ID!, $title: String!, $subjectId: ID!) {
                    updateConcept(
                        id: $conceptId
                        title: $title
                        subjectId: $subjectId
                    ) {
                        id
                    }
                }
            `, {conceptId: this.conceptId, title, subjectId: this.subjectId}, this.userToken, (error: any) => {
                this.action = setNotification(error.message, NotificationType.ERROR)
            });
        }
        else {
            const data = await GQLRequest(`
                mutation conceptUpdate($title: String!, $subjectId: ID!) {
                    createConcept(
                        title: $title
                        subjectId: $subjectId
                    ) {
                        id
                    }
                }
            `, {title, subjectId: this.subjectId}, this.userToken, (error: any) => {
              this.action = setNotification(error.message, NotificationType.ERROR)
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
