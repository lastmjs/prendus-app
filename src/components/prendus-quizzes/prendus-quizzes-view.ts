import {SetPropertyAction, SetComponentPropertyAction, DefaultAction} from '../../typings/actions';
import {User} from '../../typings/user';
import {Quiz} from '../../typings/quiz';
import {GQLVariables} from '../../typings/gql-variables';
import {createUUID, navigate, fireLocalAction} from '../../node_modules/prendus-shared/services/utilities-service';
import {shuffleArray} from '../../services/utilities-service';
import {QuestionType, NotificationType, ContextType, VerbType, ObjectType} from '../../services/constants-service';
import {setNotification, getAndSetUser, checkForUserToken} from '../../redux/actions';
import {LTIPassback} from '../../services/lti-service';
import {sendStatement} from '../../services/analytics-service';
import {GQLRequest} from '../../node_modules/prendus-shared/services/graphql-service';
import {Assignment} from '../../typings/assignment'

class PrendusQuizzesView extends Polymer.Element {
  loaded: boolean;
  action: SetPropertyAction | SetComponentPropertyAction | DefaultAction;
  componentId: string;
  userToken: string;
  user: User;
  noUserQuizzes: boolean;
  quizIds: string[];
  quizzes:  Quiz[];
  static get is() { return 'prendus-quizzes-view' }

  static get properties() {

  }

  constructor() {
    super();
    this.componentId = createUUID();
  }

  async connectedCallback() {
    this.action = fireLocalAction(this.componentId, 'loaded', false)
    await this.loadQuizzes();
    super.connectedCallback();
  }

  async loadQuizzes(){
    try{
      setTimeout(async () => {
        this.action = checkForUserToken();
        this.action = await getAndSetUser();
        const userQuizIds = await getUserQuizzes(this.user.id, this.userToken);
        const userQuizIdsArray = (userQuizIds.length) ? userQuizIds.map(quiz => quiz.id) : false;
        this.action = fireLocalAction(this.componentId, 'quizIds', userQuizIdsArray)
        this.action = fireLocalAction(this.componentId, 'loaded', true)
      }, 0);
    }catch(error){
      this.action = setNotification(error.message, NotificationType.ERROR);
      this.action = fireLocalAction(this.componentId, 'loaded', true)
    }
  }


  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    const keys = Object.keys(componentState);
    if (keys.includes('loaded')) this.loaded = componentState.loaded;
    if (keys.includes('assignment')) this.assignment = componentState.assignment;
    if (keys.includes('quizzes')) this.quizzes = componentState.quizzes;
    if (keys.includes('quizIds')) this.quizIds = componentState.quizIds;
    if (keys.includes('noUserQuizzes')) this.noUserQuizzes = componentState.noUserQuizzes;
    if (keys.includes('error')) this.error = componentState.error;
    this.userToken = state.userToken;
    this.user = state.user;
  }

}

async function getUserQuizzes(userId: String, userToken: String) {
    const data = await GQLRequest(`
      query getQuizzes($userId: ID!) {
        allQuizzes(
          first: 10
          filter: {
            author: {
              id: $userId
            }
        }) {
          id
        }
      }
    `, {userId}, userToken, (error: any) => {
      throw error;
    });
    return data.allQuizzes;
}

window.customElements.define(PrendusQuizzesView.is, PrendusQuizzesView)
