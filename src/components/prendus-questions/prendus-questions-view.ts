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
  assignment: Assignment;
  flagQuestionModalOpened: boolean;
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
        const userQuestionIds = await getUserQuestions(this.user.id, this.userToken);
        const userQuestionIdsArray = userQuestionIds.map(question => question.id)
        this.action = fireLocalAction(this.componentId, 'questionIds', userQuestionIdsArray)
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
    if (keys.includes('questions')) this.questions = componentState.questions;
    if (keys.includes('questionIds')) this.questionIds = componentState.questionIds;
    if (keys.includes('error')) this.error = componentState.error;
    if (keys.includes('flagQuestionModalOpened')) this.flagQuestionModalOpened = componentState.flagQuestionModalOpened;
    this.userToken = state.userToken;
    this.user = state.user;
    console.log('this.questionIds', this.questionIds)
  }

}

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
        }
      }
    `, {userId}, userToken, (error: any) => {
      throw error;
    });
    return data.allQuestions;
}

window.customElements.define(PrendusQuestionsView.is, PrendusQuestionsView)
