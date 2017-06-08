import {RootReducer} from '../../redux/reducers';
import {GQLSubscribe} from '../../services/graphql-service';
import {Reducer} from '../../typings/reducer';
import {State} from '../../typings/state';
import {User} from '../../typings/user';
import {checkForUserToken, getAndSetUser, removeUser, removeUserToken} from '../../redux/actions';
import {SetPropertyAction, DefaultAction} from '../../typings/actions';

class PrendusApp extends Polymer.Element {
    rootReducer: Reducer;
    user: User | null;
    action: SetPropertyAction | DefaultAction;
    userToken: string | null;

    static get is() { return 'prendus-app'; }

    async connectedCallback() {
        super.connectedCallback();

        this.rootReducer = RootReducer;

        //TODO this craziness has to do with setting the actions in the redux store element. Right now I asynchronously recurse so that actions will eventually
        //TODO fire against the store. That gets rid of gaurantees of synchronous updates to the state. Generators might be able to solve this problem. Look into it
        const checkForUserTokenAction: SetPropertyAction | DefaultAction = checkForUserToken();
        this.action = checkForUserTokenAction;
        this.action = await getAndSetUser((<SetPropertyAction> checkForUserTokenAction).value);
        // this.action = await getAndSetUser(this.userToken);
    }
    getSelectedView(rootRouteActive: any, createCourseRouteActive: any, viewCourseRouteActive: any, editCourseRouteActive: any, createLessonRouteActive: any, viewLessonRouteActive: any, editLessonRouteActive: any, createAssignmentRouteActive: any, viewAssignmentRouteActive: any, editAssignmentRouteActive: any, createDisciplineRouteActive: any, viewDisciplineRouteActive: any, editDisciplineRouteActive: any, createSubjectRouteActive: any, viewSubjectRouteActive: any, editSubjectRouteActive: any, createConceptRouteActive: any, viewConceptRouteActive: any, editConceptRouteActive: any, LearningStructureRouteActive: any, signupRouteActive: any, loginRouteActive: any, authenticateRouteActive: any) {
        if (rootRouteActive) return 'rootView';

        if (signupRouteActive) return 'signupView';
        if (loginRouteActive) return 'loginView';
        if (authenticateRouteActive) return 'authenticateView';

        if (createCourseRouteActive) return 'createCourseView';
        if (viewCourseRouteActive) return 'viewCourseView';
        if (editCourseRouteActive) return 'editCourseView';

        if (createLessonRouteActive) return 'createLessonView';
        if (viewLessonRouteActive) return 'viewLessonView';
        if (editLessonRouteActive) return 'editLessonView';

        if (createAssignmentRouteActive) return 'createAssignmentView';
        if (viewAssignmentRouteActive) return 'viewAssignmentView';
        if (editAssignmentRouteActive) return 'editAssignmentView';

        if (learningStructureRouteActive) return 'learningStructureView';

        if (createDisciplineRouteActive) return 'createDisciplineView';
        if (viewDisciplineRouteActive) return 'viewDisciplineView';
        if (editDisciplineRouteActive) return 'editDisciplineView';

        if (createSubjectRouteActive) return 'createSubjectView';
        if (viewSubjectRouteActive) return 'viewSubjectView';
        if (editSubjectRouteActive) return 'editSubjectView';

        if (createConceptRouteActive) return 'createConceptView';
        if (viewConceptRouteActive) return 'viewConceptView';
        if (editConceptRouteActive) return 'editConceptView';
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
    async logout() {
      if(this.userToken){
        this.action = await removeUser();
        this.action = removeUserToken();
      }

    }
    stateChange(e: CustomEvent) {
        const state: State = e.detail.state;

        this.user = state.user;
        this.userToken = state.userToken;
        // console.log(state);
        //
        // this.route = state.route;
        // this.routeData = state.routeData;
        // this.queryParams = state.queryParams;
    }
}

window.customElements.define(PrendusApp.is, PrendusApp);
