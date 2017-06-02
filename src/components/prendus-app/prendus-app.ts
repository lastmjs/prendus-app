import {RootReducer} from '../../redux/reducers';
import {GQLSubscribe} from '../../services/graphql-service';
import {Reducer} from '../../typings/reducer';
import {State} from '../../typings/state';
import {User} from '../../typings/user';

class PrendusApp extends Polymer.Element {
    rootReducer: Reducer;
    user: User;

    static get is() { return 'prendus-app'; }

    connectedCallback() {
        super.connectedCallback();

        this.rootReducer = RootReducer;
    }

    getSelectedView(rootRouteActive, createCourseRouteActive, viewCourseRouteActive, editCourseRouteActive, createLessonRouteActive, viewLessonRouteActive, editLessonRouteActive, signupRouteActive, loginRouteActive) {
        if (rootRouteActive) return 'rootView';

        if (signupRouteActive) return 'signupView';
        if (loginRouteActive) return 'loginView';

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
    stateChange(e: CustomEvent) {
        const state: State = e.detail.state;

        this.user = state.user;

        // console.log(state);
        //
        // this.route = state.route;
        // this.routeData = state.routeData;
        // this.queryParams = state.queryParams;
    }
}

window.customElements.define(PrendusApp.is, PrendusApp);
