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

class PrendusQuizCreate extends Polymer.Element {
  loaded: boolean;
  action: SetPropertyAction | SetComponentPropertyAction | DefaultAction;
  componentId: string;
  userToken: string;
  user: User;
  noUserQuizzes: boolean;
  quizIds: string[];
  questionIds: string[];
  quizzes:  Quiz[];
  static get is() { return 'prendus-quiz-create' }

  constructor() {
    super();
    this.componentId = createUUID();
  }

  async connectedCallback() {
    super.connectedCallback();
    this.action = fireLocalAction(this.componentId, 'loaded', false)
    this.loadQuestions();
    this.action = fireLocalAction(this.componentId, 'loaded', true)
  }

  async loadQuestions(){
    console.log('loading questions')
    try{
      this.action = checkForUserToken();
      this.action = await getAndSetUser();
      setTimeout(async () => {
        const userQuestionIds = await getUserQuestions(this.user.id, this.userToken);
        const userQuestionIdsArray = (userQuestionIds.length) ? userQuestionIds.map(question => question.id) : false;
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
    if (keys.includes('questionIds')) this.questionIds = componentState.questionIds;
    if (keys.includes('loaded')) this.loaded = componentState.loaded;
    this.userToken = state.userToken;
    this.user = state.user;
  }

}


window.customElements.define(PrendusQuizCreate.is, PrendusQuizCreate)
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
