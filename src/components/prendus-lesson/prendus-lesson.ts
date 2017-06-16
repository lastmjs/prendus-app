import {GQLQuery, GQLMutate, GQLSubscribe} from '../../services/graphql-service';
import {SetPropertyAction, SetComponentPropertyAction, DefaultAction} from '../../typings/actions';
import {ContainerElement} from '../../typings/container-element';
import {Lesson} from '../../typings/lesson';
import {Assignment} from '../../typings/assignment';
import {User} from '../../typings/user';
import {Mode} from '../../typings/mode';
import {checkForUserToken, getAndSetUser} from '../../redux/actions';
import {createUUID} from '../../services/utilities-service';

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

    constructor() {
        super();

        this.componentId = createUUID();
    }

    async connectedCallback() {
        super.connectedCallback();

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: true
        };

        this.action = checkForUserToken();
        this.action = await getAndSetUser();
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

        const data = await GQLMutate(`
            mutation {
                updateOrCreateLesson(
                    update: {
                        id: "${this.lessonId}"
                        courseId: "${this.courseId}"
                        title: "${title}"
                    }
                    create: {
                        title: "${title}"
                        courseId: "${this.courseId}"
                        authorId: "${this.user.id}"
                    }
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
            value: data.updateOrCreateLesson.id
        };
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;

        if (Object.keys(state.components[this.componentId] || {}).includes('lessonId')) this.lessonId = state.components[this.componentId].lessonId;
        if (Object.keys(state.components[this.componentId] || {}).includes('loaded')) this.loaded = state.components[this.componentId].loaded;
        this.lesson = state[`lesson${this.lessonId}`];
        this.assignments = state[`assignmentsFromLesson${this.lessonId}`];
        this.courseId = this.lesson ? this.lesson.course.id : this.courseId;
        this.userToken = state.userToken;
        this.user = state.user;
    }
}

window.customElements.define(PrendusLesson.is, PrendusLesson);
