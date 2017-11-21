import {SetPropertyAction, SetComponentPropertyAction, DefaultAction} from '../../typings/actions';
import {User} from '../../typings/user';
import {Question} from '../../typings/question';
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

class PrendusQuizView extends Polymer.Element {
  loaded: boolean;
  action: SetPropertyAction | SetComponentPropertyAction | DefaultAction;
  componentId: string;
  userToken: string;
  user: User;
  noUserQuizzes: boolean;
  quizId: string;
  quizIds: string[];
  userQuestions: Question[];
  quizQuestions: Question[];
  questionIds: string[];
  quizzes:  Quiz[];
  static get is() { return 'prendus-quiz-view' }

  static get properties() {
    return {
        quizId: {
          type: String,
          observer: 'loadQuizQuestions'
        },
    };
  }
  constructor() {
    super();
    this.componentId = createUUID();
  }

  async connectedCallback() {
    super.connectedCallback();
    this.action = fireLocalAction(this.componentId, 'loaded', false)
    this.action = checkForUserToken();
    this.action = await getAndSetUser();
    this.action = fireLocalAction(this.componentId, 'quizQuestions', [])
    this.action = fireLocalAction(this.componentId, 'loaded', true)
  }

  async loadQuizQuestions(){
    try{
      this.action = fireLocalAction(this.componentId, 'loaded', false)
      const quiz = await getQuizQuestions(this.quizId, this.userToken);
      this.action = fireLocalAction(this.componentId, 'quizQuestions', quiz.questions);
      this.action = fireLocalAction(this.componentId, 'loaded', true)
    }catch(error){
      this.action = setNotification(error.message, NotificationType.ERROR);
      this.action = fireLocalAction(this.componentId, 'loaded', true)
    }
  }

  //Make this saveQuiz
  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    const keys = Object.keys(componentState);
    if (keys.includes('loaded')) this.loaded = componentState.loaded;
    if (keys.includes('userQuestions')) this.userQuestions = componentState.userQuestions;
    if (keys.includes('quizQuestions')) this.quizQuestions = componentState.quizQuestions;
    if (keys.includes('quizId')) this.quizId = componentState.quizId;
    if (keys.includes('questionIds')) this.questionIds = componentState.questionIds;
    if (keys.includes('loaded')) this.loaded = componentState.loaded;
    this.userToken = state.userToken;
    this.user = state.user;
  }
}

window.customElements.define(PrendusQuizView.is, PrendusQuizView)

async function getQuizQuestions(quizId: String, userToken: String) {
    const data = await GQLRequest(`
      query getQuiz($quizId: ID!) {
        Quiz(id: $quizId) {
          id
          title
          questions{
            id
            text
            code
          }
        }
      }
    `, {quizId}, userToken, (error: any) => {
      throw error;
    });
    return data.Quiz;
}
