import {GQLQuery, GQLMutate} from '../../services/graphql-service';
import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {ContainerElement} from '../../typings/container-element';
import {Lesson} from '../../typings/lesson';

class PrendusLesson extends Polymer.Element implements ContainerElement {
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction;
    courseId: string;
    lessonId: string;
    loaded: boolean;
    lesson: Lesson;

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

    isViewMode(mode) {
        return mode === 'view';
    }

    isEditMode(mode) {
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
        `, (key, value) => {
            this.action = {
                type: 'SET_PROPERTY',
                key,
                value
            };
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
            `);
        }
        else {
            const data = await GQLMutate(`
                mutation {
                    createLesson(
                        title: "${title}"
                        courseId: "${this.courseId}"
                    ) {
                        id
                    }
                }
            `);

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
    }
}

window.customElements.define(PrendusLesson.is, PrendusLesson);
