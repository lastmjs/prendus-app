import {GQLQuery, GQLMutate} from '../../services/graphql-service';
import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {ContainerElement} from '../../typings/container-element';
import {Lesson} from '../../typings/lesson';
import {User} from '../../typings/user';
import {Mode} from '../../typings/mode';

class PrendusLesson extends Polymer.Element implements ContainerElement {
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction;
    courseId: string;
    lessonId: string;
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
        return mode === 'edit' || mode === 'create';
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
            alert(error);
        });
    }

    subscribeToData() {

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
            `, this.userToken);
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
            `, this.userToken);

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
        this.courseId = this.lesson ? this.lesson.course.id : this.courseId;
        this.loaded = state.components[this.componentId] ? state.components[this.componentId].loaded : this.loaded;
        this.lessonId = state.components[this.componentId] ? state.components[this.componentId].lessonId : this.lessonId;
        this.userToken = state.userToken;
        this.user = state.user;
    }
}

window.customElements.define(PrendusLesson.is, PrendusLesson);
