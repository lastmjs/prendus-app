import {GQLRedux} from '../../services/graphql-service';
import {NO_COURSE_ID} from '../../services/constants-service';

class PrendusLesson extends Polymer.Element {
    static get is() { return 'prendus-lesson'; }

    constructor() {
        super();

        this._lessonId = null;
    }

    set lessonId(val) {
        this._lessonId = val;
        this.loadData();
    }

    get lessonId() {
        return this._lessonId;
    }

    loadData() {
        if (this.lessonId === NO_COURSE_ID) {
            // this.action = {
            //     type: 'SET_PROPERTY',
            //     key: `lesson${this.lessonId}`,
            //     value: {
            //         title: '',
            //         course: {
            //             id:
            //         }
            //     }
            // };
        }
        else {
            GQLRedux(`
                query {
                    lesson${this.lessonId}: Lesson(id: "${this.lessonId}") {
                        title,
                        course {
                            id
                        }
                    }
                }
            `, this);
        }
    }

    saveLesson() {
        const title = this.shadowRoot.querySelector('#titleInput').value;

        GQLRedux(`
            mutation {
                createLesson(
                    title: "${title}"
                    courseId: "${this.lesson.course.id}"
                ) {
                    id
                    title
                }
            }
        `, this);
        this.loadData();
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;

        this.lesson = state[`lesson${this.lessonId}`];
    }
}

window.customElements.define(PrendusLesson.is, PrendusLesson);
