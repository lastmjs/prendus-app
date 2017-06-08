import {GQLQuery, GQLMutate} from '../../services/graphql-service';
import {SetPropertyAction, SetComponentPropertyAction, DefaultAction} from '../../typings/actions';
import {ContainerElement} from '../../typings/container-element';
import {Assignment} from '../../typings/assignment';
import {User} from '../../typings/user';
import {checkForUserToken, getAndSetUser} from '../../redux/actions';

class PrendusAssignment extends Polymer.Element implements ContainerElement {
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction | DefaultAction;
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

        //TODO this is slightly complicated, wait for the Redux store to support generators
        if (this.userToken && this.user) {
            await this.loadData();
            this.action = {
                type: 'SET_COMPONENT_PROPERTY',
                componentId: this.componentId,
                key: 'loaded',
                value: true
            };
        }
        else {
            this.action = checkForUserToken();
            this.action = await getAndSetUser(this.userToken);

            setTimeout(() => {
                this.assignmentIdChanged();
            });
        }
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
        `, this.userToken, (key: string, value: any) => {
            this.action = {
                type: 'SET_PROPERTY',
                key,
                value
            };
        }, (error: any) => {
            console.log(error);
        });
    }

    subscribeToData() {
      GQLSubscribe(`
          subscription changedAssignment {
              Assignment(
                  filter: {
                      mutation_in: [CREATED, UPDATED, DELETED]
                  }
              ) {
                  node {
                      id
                  }
              }
          }
      `, this.componentId, (data: any) => {
          this.loadData();
      });
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
            `, this.userToken, (error: any) => {
                console.log(error);
            });
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
            `, this.userToken, (error: any) => {
                console.log(error);
            });

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
