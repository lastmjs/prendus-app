import {GQLRequest, GQLSubscribe} from '../../node_modules/prendus-shared/services/graphql-service';
import {ContainerElement} from '../../typings/container-element';
import {Mode} from '../../typings/mode';
import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {setNotification} from '../../redux/actions';
import {Subject} from '../../typings/subject';
import {Concept} from '../../typings/concept';
import {User} from '../../typings/user';
import {createUUID} from '../../node_modules/prendus-shared/services/utilities-service';
import {NotificationType} from '../../services/constants-service';

class PrendusSubject extends Polymer.Element implements ContainerElement {
    subjectId: string;
    subject: Subject;
    disciplineId: string;
    concepts: Concept[];
    mode: Mode;
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction;
    loaded: boolean;
    userToken: string;
    user: User;

    static get is() { return 'prendus-subject'; }
    static get properties() {
        return {
            subjectId: {
                observer: 'subjectIdChanged'
            },
            disciplineId: {

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
        this.subscribeToData();
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

    async subjectIdChanged() {
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'subjectId',
            value: this.subjectId
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
    subscribeToData() {

    }
    async loadData() {
        const subjectKey = `subject${this.subjectId}`;
        const conceptKey = `conceptsFromSubject${this.subjectId}`;
        const data = await GQLRequest(`
            query concepts($subjectId: ID!) {
                ${conceptKey}: allConcepts(filter: {
                    subject: {
                        id: $subjectId
                    }
                }) {
                    id
                    title
                }
                ${subjectKey}: Subject(id: $subjectId) {
                    title
                    discipline {
                        id
                    }
                }
            }
        `, {subjectId: this.subjectId}, this.userToken, (error: any) => {
            this.action = setNotification(error.message, NotificationType.ERROR)
        });
        this.action = {
            type: 'SET_PROPERTY',
            key: conceptKey,
            value: data[conceptKey]
        };
        this.action = {
            type: 'SET_PROPERTY',
            key: subjectKey,
            value: data[subjectKey]
        };
    }

    async saveSubject() {
        const title = this.shadowRoot.querySelector('#titleInput').value;
        //TODO replace this with an updateOrCreate mutation once you figure out how to do that. You had a conversation on slack about it
        if (this.subjectId) {
            GQLRequest(`
                mutation update($subjectId: ID!, $title: String!, $disciplineId: ID!) {
                    updateSubject(
                        id: $subjectId
                        title: $title
                        disciplineId: $disciplineId
                    ) {
                        id
                    }
                }
            `, {subjectId: this.subjectId, title, disciplineId: this.disciplineId}, this.userToken, (error: any) => {
                this.action = setNotification(error.message, NotificationType.ERROR)
            });
        }
        else {
            const data = await GQLRequest(`
                mutation subject($title: String!, $disciplineId: ID!) {
                    createSubject(
                        title: $title
                        disciplineId: $disciplineId
                    ) {
                        id
                    }
                }
            `, {title, disciplineId: this.disciplineId}, this.userToken, (error: any) => {
                console.log('error', error)
                this.action = setNotification(error.message, NotificationType.ERROR)
            });
            this.action = {
                type: 'SET_COMPONENT_PROPERTY',
                componentId: this.componentId,
                key: 'subjectId',
                value: data.createSubject.id
            };
        }
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        this.subjectId = state.components[this.componentId] ? state.components[this.componentId].subjectId : this.subjectId;
        this.concepts = state[`conceptsFromSubject${this.subjectId}`];
        this.subject = state[`subject${this.subjectId}`];
        this.disciplineId = this.subject ? this.subject.discipline.id : this.disciplineId;
        this.loaded = state.components[this.componentId] ? state.components[this.componentId].loaded : this.loaded;
        this.userToken = state.userToken;
        this.user = state.user;
    }
}

window.customElements.define(PrendusSubject.is, PrendusSubject);
