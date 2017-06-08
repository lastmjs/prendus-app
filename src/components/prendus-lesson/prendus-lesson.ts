import {GQLQuery, GQLMutate, GQLSubscribe} from '../../services/graphql-service';
import {SetPropertyAction, SetComponentPropertyAction, DefaultAction} from '../../typings/actions';
import {ContainerElement} from '../../typings/container-element';
import {Lesson} from '../../typings/lesson';
import {Assignment} from '../../typings/assignment';
import {User} from '../../typings/user';
import {Mode} from '../../typings/mode';
import {checkForUserToken, getAndSetUser} from '../../redux/actions';

class PrendusLesson extends Polymer.Element implements ContainerElement {
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction | DefaultAction;
    courseId: string;
    lessonId: string;
    assignments: Assignment[];
    loaded: boolean;
    lesson: Lesson;
    userToken: string;
    user: User;

    static get is() { return 'prendus-lesson'; }
    static get properties() {
        return {
            lessonId: {
                observer: 'lessonIdChanged'
            },
            courseId: {

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

    isViewMode(mode: Mode) {
        return mode === 'view';
    }

    isEditMode(mode: Mode) {
        return mode === 'edit';
    }

    isCreateMode(mode: Mode) {
        return mode === 'create';
    }

    async lessonIdChanged() {
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'lessonId',
            value: this.lessonId
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
                this.lessonIdChanged();
            });
        }
    }

    async loadData() {
        await GQLQuery(`
            query {
                assignmentsFromLesson${this.lessonId}: allAssignments(filter: {
                    lesson: {
                        id: "${this.lessonId}"
                    }
                }) {
                    id
                    title
                }
                lesson${this.lessonId}: Lesson(id: "${this.lessonId}") {
                    title,
                    course {
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

    async saveLesson() {
        const title = this.shadowRoot.querySelector('#titleInput').value;

        if (this.lessonId) {
            GQLMutate(`
                mutation {
                    updateLesson(
                        id: "${this.lessonId}"
                        courseId: "${this.courseId}"
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
                    createLesson(
                        title: "${title}"
                        courseId: "${this.courseId}"
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
                key: 'lessonId',
                value: data.createLesson.id
            };
        }
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;

        this.lesson = state[`lesson${this.lessonId}`];
        this.lessonId = state.components[this.componentId] ? state.components[this.componentId].lessonId : this.lessonId;
        this.assignments = state[`assignmentsFromLesson${this.lessonId}`];
        this.courseId = this.lesson ? this.lesson.course.id : this.courseId;
        this.loaded = state.components[this.componentId] ? state.components[this.componentId].loaded : this.loaded;
        this.userToken = state.userToken;
        this.user = state.user;
    }
}

window.customElements.define(PrendusLesson.is, PrendusLesson);
