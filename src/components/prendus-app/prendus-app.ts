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

    getSelectedView(rootRouteActive: any, whatIsPrendusRouteActive: any, whyPrendusRouteActive: any, courseSetupRouteActive: any, howItWorksRouteActive: any, researchRouteActive: any, oerRouteActive: any, coursesRouteActive: any, createCourseRouteActive: any, viewCourseRouteActive: any, editCourseRouteActive: any, paymentCourseRouteActive: any, courseQuestionRatingsRouteActive: any, createAssignmentRouteActive: any, assignmentCreateRouteActive: any, assignmentReviewRouteActive: any, assignmentGradeRouteActive: any, assignmentQuizRouteActive: any, editAssignmentRouteActive: any, createDisciplineRouteActive: any, viewDisciplineRouteActive: any, editDisciplineRouteActive: any, createSubjectRouteActive: any, viewSubjectRouteActive: any, editSubjectRouteActive: any, createConceptRouteActive: any, viewConceptRouteActive: any, editConceptRouteActive: any, teacherApprovalRouteActive: any, learningStructureRouteActive: any, signupRouteActive: any, loginRouteActive: any, authenticateRouteActive: any, viewQuestionRouteActive: any, createQuestionRouteActive: any, editQuestionRouteActive: any, viewQuestionsRouteActive: any, editDemoQuestionRouteActive: any, examplesQuestionRouteActive: any, openSourceRouteActive: any, demoAssignmentRouteActive: any, passwordResetRouteActive: any) {
        this.action = checkForUserToken();
        if (rootRouteActive){
          if(this.userToken){
            window.ga('set', 'page', '/courses');
            window.ga('send', 'pageview');
            return 'coursesView';
          }else{
            window.ga('set', 'page', '/');
            window.ga('send', 'pageview');
            return 'rootView';
          }
        }
        if(whatIsPrendusRouteActive){
          window.ga('set','page',this.route.path);
          window.ga('send','pageview');
          return 'whatIsPrendusView';
        }
        if(whyPrendusRouteActive){
          window.ga('set','page',this.route.path);
          window.ga('send','pageview');
          return 'whyPrendusView';
        }
        if(courseSetupRouteActive){
        window.ga('set','page', this.route.path);
        window.ga('send','pageview');
        return 'courseSetupView';
        }
        if(howItWorksRouteActive){
        window.ga('set','page', this.route.path);
        window.ga('send','pageview');
        return 'howItWorksView';
        }
        if(researchRouteActive){
          window.ga('set','page', this.route.path);
          window.ga('send','pageview');
          return 'researchView';
        }
        if(oerRouteActive){
          window.ga('set','page', this.route.path);
          window.ga('send','pageview');
          return 'oerView';
        }
        if (signupRouteActive){
          console.log('signup active')
          window.ga('set', 'page', this.route.path);
          window.ga('send', 'pageview');
          return 'signupView';
        }
        if (loginRouteActive){
          window.ga('set', 'page', this.route.path);
          window.ga('send', 'pageview');
          return 'loginView';
        }
        if (authenticateRouteActive){
          window.ga('set', 'page', this.route.path);
          window.ga('send', 'pageview');
          return 'authenticateView';
        }
        if (openSourceRouteActive){
          window.ga('set', 'page', this.route.path);
          window.ga('send', 'pageview');
          return 'openSourceView';
        }
        if (coursesRouteActive){
          window.ga('set', 'page', this.route.path);
          window.ga('send', 'pageview');
          return 'coursesView';
        }
        if (createCourseRouteActive){
          window.ga('set', 'page', this.route.path);
          window.ga('send', 'pageview');
          return 'createCourseView';
        }
        if (viewCourseRouteActive){
          window.ga('set', 'page', this.route.path);
          window.ga('send', 'pageview');
          return 'viewCourseView';
        }
        if (editCourseRouteActive){
          window.ga('set', 'page', this.route.path);
          window.ga('send', 'pageview');
          return 'editCourseView';
        }
        if (paymentCourseRouteActive){
          window.ga('set', 'page', this.route.path);
          window.ga('send', 'pageview');
          return 'paymentCourseView';
        }
        if (courseQuestionRatingsRouteActive){
          window.ga('set', 'page', this.route.path);
          window.ga('send', 'pageview');
          return 'courseQuestionRatingsView';
        }

        if (createAssignmentRouteActive){
          window.ga('set', 'page', this.route.path);
          window.ga('send', 'pageview');
          return 'createAssignmentView';
        }
        if (demoAssignmentRouteActive){
          console.log('assignment demo')
          window.ga('set', 'page', this.route.path);
          window.ga('send', 'pageview');
          return 'assignmentDemoView';
        }
        if (assignmentCreateRouteActive){
          window.ga('set', 'page', this.route.path);
          window.ga('send', 'pageview');
          return 'assignmentCreateView';
        }
        if (assignmentReviewRouteActive){
          window.ga('set', 'page', this.route.path);
          window.ga('send', 'pageview');
          return 'assignmentReviewView';
        }
        if (assignmentGradeRouteActive){
          window.ga('set', 'page', this.route.path);
          window.ga('send', 'pageview');
          return 'assignmentGradeView';
        }
        if (assignmentQuizRouteActive){
          window.ga('set', 'page', this.route.path);
          window.ga('send', 'pageview');
          return 'assignmentQuizView';
        }
        if (editAssignmentRouteActive){
          window.ga('set', 'page', this.route.path);
          window.ga('send', 'pageview');
          return 'editAssignmentView';
        }

        if (learningStructureRouteActive){
          window.ga('set', 'page', this.route.path);
          window.ga('send', 'pageview');
          return 'learningStructureView';
        }

        if (teacherApprovalRouteActive){
          window.ga('set', 'page', this.route.path);
          window.ga('send', 'pageview');
          return 'teacherApprovalView';
        }

        if (createDisciplineRouteActive){
          window.ga('set', 'page', this.route.path);
          window.ga('send', 'pageview');
          return 'createDisciplineView';
        }
        if (viewDisciplineRouteActive){
          window.ga('set', 'page', this.route.path);
          window.ga('send', 'pageview');
          return 'viewDisciplineView';
        }
        if (editDisciplineRouteActive){
          window.ga('set', 'page', this.route.path);
          window.ga('send', 'pageview');
          return 'editDisciplineView';
        }

        if (createSubjectRouteActive){
          window.ga('set', 'page', this.route.path);
          window.ga('send', 'pageview');
          return 'createSubjectView';
        }
        if (viewSubjectRouteActive){
          window.ga('set', 'page', this.route.path);
          window.ga('send', 'pageview');
          return 'viewSubjectView';
        }
        if (editSubjectRouteActive){
          window.ga('set', 'page', this.route.path);
          window.ga('send', 'pageview');
          return 'editSubjectView';
        }
        if (createConceptRouteActive){
          window.ga('set', 'page', this.route.path);
          window.ga('send', 'pageview');
          return 'createConceptView';
        }
        if (viewConceptRouteActive){
          window.ga('set', 'page', this.route.path);
          window.ga('send', 'pageview');
          return 'viewConceptView';
        }
        if (editConceptRouteActive){
          window.ga('set', 'page', this.route.path);
          window.ga('send', 'pageview');
          return 'editConceptView';
        }
        if (viewQuestionRouteActive){
          window.ga('set', 'page', this.route.path);
          window.ga('send', 'pageview');
          return 'viewQuestionView';
        }
        if (createQuestionRouteActive){
          window.ga('set', 'page', this.route.path);
          window.ga('send', 'pageview');
          return 'createQuestionView';
        }
        if (editQuestionRouteActive){
          window.ga('set', 'page', this.route.path);
          window.ga('send', 'pageview');
          return 'editQuestionView';
        }
        if (editDemoQuestionRouteActive){
          window.ga('set', 'page', this.route.path);
          window.ga('send', 'pageview');
          return 'editDemoQuestionView';
        }
        if (examplesQuestionRouteActive){
          window.ga('set', 'page', this.route.path);
          window.ga('send', 'pageview');
          return 'examplesQuestionView';
        }
        if (viewQuestionsRouteActive){
          window.ga('set', 'page', this.route.path);
          window.ga('send', 'pageview');
          return 'viewQuestionsView';
        }
        if (passwordResetRouteActive){
          window.ga('set', 'page', this.route.path);
          window.ga('send', 'pageview');
          return 'passwordResetView';
        }
    }

    _isStudent(user: User): boolean {
      return user ? user.role === 'STUDENT' : true;
    }
    logout() {
      console.log('logout')
      if (this.userToken){
        this.action = removeUser();
        this.action = removeUserToken();
        navigate(`/login`)
      }
    }
    narrowToggle(){
      this.shadowRoot.querySelector('#prendus-drawer').forceNarrow = true;
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
