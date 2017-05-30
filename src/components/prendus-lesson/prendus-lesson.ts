import {GQLRedux} from '../../services/graphql-service';
import {NO_COURSE_ID} from '../../services/constants-service';

class PrendusLesson extends Polymer.Element {
    static get is() { return 'prendus-lesson'; }
    static get properties() {
        return {
            lessonId: {
                observer: 'loadData'
            },
            courseId: {

            },
            mode: {

            }
        };
    }

    constructor() {
        super();

        this.loaded = true;
    }

    isViewMode(mode) {
        return mode === 'view';
    }

    isEditMode(mode) {
        return mode === 'edit' || mode === 'create';
    }

    async loadData() {
        this.loaded = false;
        await GQLRedux(`
            query {
                lesson${this.lessonId}: Lesson(id: "${this.lessonId}") {
                    title,
                    course {
                        id
                    }
                }
            }
        `, this);
        this.loaded = true;
    }

    async saveLesson() {
        const title = this.shadowRoot.querySelector('#titleInput').value;

        if (this.lessonId) {
            GQLRedux(`
                mutation {
                    updateLesson(
                        id: "${this.lessonId}"
                        courseId: "${this.courseId}"
                        title: "${title}"
                    ) {
                        id
                    }
                }
            `, this);
        }
        else {
            const data = await GQLRedux(`
                mutation {
                    createLesson(
                        title: "${title}"
                        courseId: "${this.courseId}"
                    ) {
                        id
                    }
                }
            `, this);
            this.lessonId = data.createLesson.id;
        }
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;

        this.lesson = state[`lesson${this.lessonId}`];
        this.courseId = this.lesson ? this.lesson.course.id : this.courseId;
    }
}

window.customElements.define(PrendusLesson.is, PrendusLesson);
