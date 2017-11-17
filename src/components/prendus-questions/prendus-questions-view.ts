import {SetPropertyAction, SetComponentPropertyAction, DefaultAction} from '../../typings/actions';
import {User} from '../../typings/user';
import {Question} from '../../typings/question';
import {GQLVariables} from '../../typings/gql-variables';
import {createUUID, navigate, fireLocalAction} from '../../node_modules/prendus-shared/services/utilities-service';
import {shuffleArray} from '../../services/utilities-service';
import {QuestionType, NotificationType, ContextType, VerbType, ObjectType} from '../../services/constants-service';
import {setNotification, getAndSetUser, checkForUserToken} from '../../redux/actions';
import {LTIPassback} from '../../services/lti-service';
import {sendStatement} from '../../services/analytics-service';
import {GQLRequest} from '../../node_modules/prendus-shared/services/graphql-service';
import {Assignment} from '../../typings/assignment'

class PrendusQuestionsView extends Polymer.Element {
  loaded: boolean;
  action: SetPropertyAction | SetComponentPropertyAction | DefaultAction;
  componentId: string;
  userToken: string;
  user: User;
  noUserQuestions: boolean;
  questionIds: string[];
  questions:  Question[];
  static get is() { return 'prendus-questions-view' }

  static get properties() {

  }

  constructor() {
    super();
    this.componentId = createUUID();
  }

  async connectedCallback() {
    this.action = fireLocalAction(this.componentId, 'loaded', false)
    await this.loadQuestions();
    super.connectedCallback();
  }

  async loadQuestions(){
    try{
      setTimeout(async () => {
        this.action = checkForUserToken();
        this.action = await getAndSetUser();
        const userQuestions = await getUserQuestions(this.user.id, this.userToken);
        this.action = fireLocalAction(this.componentId, 'questions', userQuestions)
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
    if (keys.includes('questions')) this.questions = componentState.questions;
    if (keys.includes('questionIds')) this.questionIds = componentState.questionIds;
    if (keys.includes('noUserQuestions')) this.noUserQuestions = componentState.noUserQuestions;
    if (keys.includes('error')) this.error = componentState.error;
    this.userToken = state.userToken;
    this.user = state.user;
  }

}

window.customElements.define(PrendusQuestionsView.is, PrendusQuestionsView)

async function getUserQuestions(userId: String, userToken: String) {
    const data = await GQLRequest(`
      query getQuestions($userId: ID!) {
        allQuestions(
          first: 10
          filter: {
            author: {
              id: $userId
            }
        }) {
          id
          text
          code
        }
      }
    `, {userId}, userToken, (error: any) => {
      throw error;
    });
    return data.allQuestions;
}
