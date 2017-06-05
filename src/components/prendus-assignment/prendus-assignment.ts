import {GQLQuery, GQLMutate} from '../../services/graphql-service';
import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {ContainerElement} from '../../typings/container-element';
import {Assignment} from '../../typings/assignment';
import {User} from '../../typings/user';

class PrendusAssignment extends Polymer.Element implements ContainerElement {
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction;
    lessonId: string;
    assignmentId: string;
    loaded: boolean;
    assignment: Assignment;
    userToken: string | null;
    user: User | null;

    static get is() { return 'prendus-assignment'; }
    static get properties() {
        return {
            assignmentId: {
                observer: 'assignmentIdChanged'
            },
            lessonId: {

            },
            mode: {

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

    isViewMode(mode) {
        return mode === 'view';
    }

    isEditMode(mode) {
        return mode === 'edit' || mode === 'create';
    }

    async assignmentIdChanged() {
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'assignmentId',
            value: this.assignmentId
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
                assignment${this.assignmentId}: Assignment(id: "${this.assignmentId}") {
                    title,
                    lesson {
                        id
                    }
                }
            }
        `, this.userToken, (key, value) => {
            this.action = {
                type: 'SET_PROPERTY',
                key,
                value
            };
        });
    }

    subscribeToData() {

    }

    async saveAssignment() {
        const title = this.shadowRoot.querySelector('#titleInput').value;
        if (this.assignmentId) {
            GQLMutate(`
                mutation {
                    updateAssignment(
                        id: "${this.assignmentId}"
                        lessonId: "${this.lessonId}"
                        title: "${title}"
                    ) {
                        id
                    }
                }
            `, this.userToken);
        }
        else {
            const data = await GQLMutate(`
                mutation {
                    createAssignment(
                        title: "${title}"
                        lessonId: "${this.lessonId}"
                        authorId: "${this.user.id}"
                    ) {
                        id
                    }
                }
            `, this.userToken);

            this.action = {
                type: 'SET_COMPONENT_PROPERTY',
                componentId: this.componentId,
                key: 'assignmentId',
                value: data.createAssignment.id
            };
        }
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;

        this.assignment = state[`assignment${this.assignmentId}`];
        this.assignmentId = state.components[this.componentId] ? state.components[this.componentId].assignmentId : this.assignmentId;
        this.lessonId = this.assignment ? this.assignment.lesson.id : this.lessonId;
        this.loaded = state.components[this.componentId] ? state.components[this.componentId].loaded : this.loaded;
        this.userToken = state.userToken;
        this.user = state.user;
    }
}

window.customElements.define(PrendusAssignment.is, PrendusAssignment);
