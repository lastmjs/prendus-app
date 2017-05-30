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
        this.loaded = true;
    }

    async saveCourse() {
        const title = this.shadowRoot.querySelector('#titleInput').value;

        //TODO replace this with an updateOrCreate mutation once you figure out how to do that. You had a conversation on slack about it
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
            const data = await GQLRedux(`
                mutation {
                    createCourse(
                        title: "${title}"
                    ) {
                        id
                    }
                }
            `, this);
            this.courseId = data.createCourse.id; //TODO get rid of this unmanaged mutation once we have a local state solution for integrating with Redux
        }
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;

        this.lessons = state[`lessonsFromCourse${this.courseId}`];
        this.course = state[`course${this.courseId}`];
    }
}

window.customElements.define(PrendusCourse.is, PrendusCourse);
