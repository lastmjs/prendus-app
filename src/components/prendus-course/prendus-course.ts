import {GQLRedux} from '../../services/graphql-service';
import {PrendusElement} from '../../typings/prendus-element';

class PrendusCourse extends Polymer.Element implements PrendusElement {
    static get is() { return 'prendus-course'; }

    constructor() {
        super();

        this.courseId = null;
    }

    set courseId(val) {
        this._courseId = val;
        this.loadData();
    }

    get courseId() {
        return this._courseId;
    }

    loadData() {
        GQLRedux(`
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
        `, this);
    }

    addLesson() {
        GQLRedux(`
            mutation {
                createLesson(
                    title: "Test Lesson"
                    courseId: "${this.courseId}"
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

        this.lessons = state[`lessonsFromCourse${this.courseId}`];
        this.course = state[`course${this.courseId}`];
    }
}

window.customElements.define(PrendusCourse.is, PrendusCourse);
