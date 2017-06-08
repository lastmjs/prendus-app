import {GQLQuery, GQLMutate, GQLSubscribe} from '../../services/graphql-service';
import {ContainerElement} from '../../typings/container-element';
import {Mode} from '../../typings/mode';
import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {Lesson} from '../../typings/lesson';
import {Course} from '../../typings/course';
import {User} from '../../typings/user';

class PrendusCourse extends Polymer.Element implements ContainerElement {
    courseId: string;
    mode: Mode;
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction;
    lessons: Lesson[];
    course: Course;
    loaded: boolean;
    userToken: string;
    user: User;

    static get is() { return 'prendus-course'; }
    static get properties() {
        return {
            courseId: {
                observer: 'courseIdChanged'
            },
            mode: {

            }
        };
    }

    connectedCallback() {
        super.connectedCallback();

        this.componentId = this.shadowRoot.querySelector('#reduxStoreElement').elementId;
        this.subscribeToData();
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

    async courseIdChanged() {
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'courseId',
            value: this.courseId
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
                lessonsFromCourse${this.courseId}: allLessons(filter: {
                    course: {
                        id: "${this.courseId}"
                    }
                }) {
                    id
                    title
                }
                course${this.courseId}: Course(id: "${this.courseId}") {
                    title
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
            subscription changedLesson {
                Lesson(
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

    async saveCourse() {
        const title = this.shadowRoot.querySelector('#titleInput').value;

        //TODO working on updateOrCreate

        //TODO replace this with an updateOrCreate mutation once you figure out how to do that. You had a conversation on slack about it
        if (this.courseId) {
            GQLMutate(`
                mutation {
                    updateCourse(
                        id: "${this.courseId}"
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
                    createCourse(
                        title: "${title}"
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
                key: 'courseId',
                value: data.createCourse.id
            };
        }
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;

        this.courseId = state.components[this.componentId] ? state.components[this.componentId].courseId : this.courseId;
        this.lessons = state[`lessonsFromCourse${this.courseId}`];
        this.course = state[`course${this.courseId}`];
        this.loaded = state.components[this.componentId] ? state.components[this.componentId].loaded : this.loaded;
        this.userToken = state.userToken;
        this.user = state.user;
    }
}

window.customElements.define(PrendusCourse.is, PrendusCourse);
