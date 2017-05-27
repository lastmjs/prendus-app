import {GQLRedux} from '../../services/graphql-service';
import {PrendusElement} from '../../typings/prendus-element';

class PrendusCourses extends Polymer.Element implements PrendusElement {
    public courses: Course[];

    static get is() { return 'prendus-courses'; }

    subscribedToStore() {
        this.loadData();
    }

    loadData() {
        GQLRedux(`
            query {
                allCourses {
                    id
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
