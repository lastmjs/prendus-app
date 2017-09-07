import {RootReducer} from '../../redux/reducers';
import {navigate} from '../../node_modules/prendus-shared/services/utilities-service';
import {Reducer} from '../../typings/reducer';
import {State} from '../../typings/state';
import {User} from '../../typings/user';
import {Notification} from '../../typings/notification';
import {checkForUserToken, getAndSetUser, removeUser, removeUserToken} from '../../redux/actions';
import {SetPropertyAction, DefaultAction} from '../../typings/actions';

class PrendusApp extends Polymer.Element {
    rootReducer: Reducer;
    user: User | null;
    action: SetPropertyAction | DefaultAction;
    userToken: string | null;
    notification: Notification;
    static get is() { return 'prendus-app'; }

    constructor() {
        super();
        this.rootReducer = RootReducer;
    }

    async connectedCallback() {
        super.connectedCallback();

        this.action = checkForUserToken();
        this.action = await getAndSetUser();
    }

    getSelectedView(rootRouteActive: any, coursesRouteActive: any, createCourseRouteActive: any, viewCourseRouteActive: any, editCourseRouteActive: any, paymentCourseRouteActive: any, courseQuestionRatingsRouteActive: any, createAssignmentRouteActive: any, assignmentCreateRouteActive: any, assignmentReviewRouteActive: any, assignmentGradeRouteActive: any, assignmentQuizRouteActive: any, editAssignmentRouteActive: any, createDisciplineRouteActive: any, viewDisciplineRouteActive: any, editDisciplineRouteActive: any, createSubjectRouteActive: any, viewSubjectRouteActive: any, editSubjectRouteActive: any, createConceptRouteActive: any, viewConceptRouteActive: any, editConceptRouteActive: any, teacherApprovalRouteActive: any, learningStructureRouteActive: any, signupRouteActive: any, loginRouteActive: any, authenticateRouteActive: any, viewQuestionRouteActive: any, createQuestionRouteActive: any, editQuestionRouteActive: any, editDemoQuestionRouteActive: any, examplesQuestionRouteActive: any, openSourceRouteActive: any, scapholdDemoRouteActive: any) {
        this.action = checkForUserToken();
        console.log('this.queryParams', this.queryParams)
        console.log('this.route', this.route.path)
        console.log('isActive', viewAssignmentRouteActive)
        window.ga('set', 'page', `/${this.route.path}`);
        window.ga('send', 'pageview');
        if (rootRouteActive){
          if(this.userToken){
            return 'coursesView';
          }else{
            return 'rootView';
          }
        }

        if (signupRouteActive){

          return 'signupView';
        }
        if (loginRouteActive) return 'loginView';
        if (authenticateRouteActive) return 'authenticateView';
        if (openSourceRouteActive) return 'openSourceView';
        if (scapholdDemoRouteActive) return 'scapholdDemoView';

        if (coursesRouteActive) return 'coursesView';
        if (createCourseRouteActive) return 'createCourseView';
        if (viewCourseRouteActive) return 'viewCourseView';
        if (editCourseRouteActive) return 'editCourseView';
        if (paymentCourseRouteActive) return 'paymentCourseView';
        if (courseQuestionRatingsRouteActive) return 'courseQuestionRatingsView';

        if (createAssignmentRouteActive) return 'createAssignmentView';
        if (assignmentCreateRouteActive) return 'assignmentCreateView';
        if (assignmentReviewRouteActive) return 'assignmentReviewView';
        if (assignmentGradeRouteActive) return 'assignmentGradeView';
        if (assignmentQuizRouteActive) return 'assignmentQuizView';
        if (editAssignmentRouteActive) return 'editAssignmentView';

        if (learningStructureRouteActive) return 'learningStructureView';

        if (teacherApprovalRouteActive) return 'teacherApprovalView';

        if (createDisciplineRouteActive) return 'createDisciplineView';
        if (viewDisciplineRouteActive) return 'viewDisciplineView';
        if (editDisciplineRouteActive) return 'editDisciplineView';

        if (createSubjectRouteActive) return 'createSubjectView';
        if (viewSubjectRouteActive) return 'viewSubjectView';
        if (editSubjectRouteActive) return 'editSubjectView';

        if (createConceptRouteActive) return 'createConceptView';
        if (viewConceptRouteActive) return 'viewConceptView';
        if (editConceptRouteActive) return 'editConceptView';

        if (viewQuestionRouteActive) return 'viewQuestionView';
        if (createQuestionRouteActive) return 'createQuestionView';
        if (editQuestionRouteActive) return 'editQuestionView';
        if (editDemoQuestionRouteActive) return 'editDemoQuestionView';
        if (examplesQuestionRouteActive) return 'examplesQuestionView';
    }

    _isStudent(user: User): boolean {
      return user ? user.role === 'STUDENT' : true;
    }

    logout() {
      if (this.userToken){
        this.action = removeUser();
        this.action = removeUserToken();
        navigate(`/signup`)
      }
    }
    //TODO put the route in redux
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
        this.userToken = state.userToken;
        this.notification = state.notification;
    }
}

window.customElements.define(PrendusApp.is, PrendusApp);
