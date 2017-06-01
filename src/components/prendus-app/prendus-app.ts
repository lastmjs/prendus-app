import {RootReducer} from '../../redux/reducers';
import {GQLSubscribe} from '../../services/graphql-service';

class PrendusApp extends Polymer.Element {
    static get is() { return 'prendus-app'; }

    constructor() {
        super();

        setTimeout(() => {
            GQLSubscribe(`
                subscription changedCourse {
                    Course(
                        filter: {
                            mutation_in: [CREATED, UPDATED, DELETED]
                        }
                    ) {
                        node {
                            id
                        }
                    }
                }
            `);
        }, 5000);
    }

    connectedCallback() {
        super.connectedCallback();

        this.rootReducer = RootReducer;
    }

    getSelectedView(rootRouteActive, createCourseRouteActive, viewCourseRouteActive, editCourseRouteActive, createLessonRouteActive, viewLessonRouteActive, editLessonRouteActive) {
        if (rootRouteActive) return 'rootView';

        if (createCourseRouteActive) return 'createCourseView';
        if (viewCourseRouteActive) return 'viewCourseView';
        if (editCourseRouteActive) return 'editCourseView';

        if (createLessonRouteActive) return 'createLessonView';
        if (viewLessonRouteActive) return 'viewLessonView';
        if (editLessonRouteActive) return 'editLessonView';
    }
    //
    // subscribedToStore() {
    //     this.subscribedToStore = true;
    // }
    //
    // routeChanged(e: CustomEvent) {
    //     if (this.subscribedToStore) return;
    //
    //     const appLocation = this.shadowRoot.querySelector('#appLocation');
    //     const route = appLocation.route;
    //     const routeData = appLocation.routeData;
    //     const queryParams = appLocation.queryParams;
    //
    //     this.action = {
    //         type: 'SET_PROPERTY',
    //         key: 'route',
    //         value: route
    //     };
    //
    //     this.action = {
    //         type: 'SET_PROPERTY',
    //         key: 'routeData',
    //         value: routeData
    //     };
    //
    //     this.action = {
    //         type: 'SET_PROPERTY',
    //         key: 'queryParams',
    //         value: queryParams
    //     };
    // }
    //
    // stateChange(e: CustomEvent) {
    //     const state = e.detail.state;
    //
    //     console.log(state);
    //
    //     this.route = state.route;
    //     this.routeData = state.routeData;
    //     this.queryParams = state.queryParams;
    // }
}

window.customElements.define(PrendusApp.is, PrendusApp);
