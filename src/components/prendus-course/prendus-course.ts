import {GQLRedux} from '../../services/graphql-service';
import {PrendusElement} from '../../typings/prendus-element';

class PrendusCourse extends Polymer.Element implements PrendusElement {
    public courseId: string;

    static get is() { return 'prendus-course'; }
    static get properties() {
        return {
            courseId: {
                observer: 'loadData'
            },
            mode: {
            }
        };
    }

    isViewMode(mode) {
        return mode === 'view';
    }

    isEditMode(mode) {
        return mode === 'edit';
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

    saveCourse() {
        const title = this.shadowRoot.querySelector('#titleInput').value;

        if (this.courseId) {
            GQLRedux(`
                mutation {
                    updateCourse(
                        id: "${this.courseId}"
                        title: "${title}"
                    ) {
                        id
                    }
                }
            `, this);
        }
        else {

        }
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;

        this.lessons = state[`lessonsFromCourse${this.courseId}`];
        this.course = state[`course${this.courseId}`];
        // this.loaded = state[]; //TODO set a loaded property for this component when all of the data has been fetched
    }
}

window.customElements.define(PrendusCourse.is, PrendusCourse);
