import {GQLRedux} from '../../services/graphql-service';

class PrendusCourses extends Polymer.Element {
    public courses: Course[];

    static get is() { return 'prendus-courses'; }

    subscribedToStore() {
        GQLRedux(`
            query {
                allCourses {
                    title
                }
            }
        `, this);
    }

    async stateChange(e: CustomEvent) {
        const state = e.detail.state;

        this.courses = state.allCourses;
    }
}

window.customElements.define(PrendusCourses.is, PrendusCourses);
