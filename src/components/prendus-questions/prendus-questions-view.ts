import {SetPropertyAction, SetComponentPropertyAction, DefaultAction} from '../../prendus.d';
import {User, Question, Assignment} from '../../prendus.d';
import {createUUID, navigate, fireLocalAction} from '../../node_modules/prendus-shared/services/utilities-service';
import {shuffleArray} from '../../services/utilities-service';
import {QuestionType, NotificationType, ContextType, VerbType, ObjectType} from '../../services/constants-service';
import {setNotification, getAndSetUser, checkForUserToken} from '../../redux/actions';
import {LTIPassback} from '../../services/lti-service';
import {sendStatement} from '../../services/analytics-service';
import {GQLRequest} from '../../node_modules/prendus-shared/services/graphql-service';

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

  openConfirmDeleteQuestionModal(e){
    this.shadowRoot.querySelector('#confirmDeleteQuestionModal').open()
  }
  closeConfirmDeleteQuestionModal(e){
    this.shadowRoot.querySelector('#confirmDeleteQuestionModal').close()
  }

  async deleteQuestion(e: any){
    try{
      this.shadowRoot.querySelector('#confirmDeleteQuestionModal').close()
      this.action = fireLocalAction(this.componentId, 'loaded', false);
      const questionId = e.target.id;
      console.log('button questionId', questionId)
      const deletedQuestionId = await deleteQuestion(this.user.id, this.userToken, questionId);
      console.log('deletedQuestionId', deletedQuestionId)
      const newUserQuestions = this.questions.reduce((newUserQuestionsArray: Question[], question: Question) => {
        console.log('deletedQ ID', deletedQuestionId)
        console.log('question ID', question.id)
        if(question.id !== deletedQuestionId)  newUserQuestionsArray.push(question);
        return newUserQuestionsArray;
      }, []);
      console.log('this.userQuestions', this.questions)
      console.log('this.newquestions', newUserQuestions)
      this.action = fireLocalAction(this.componentId, 'questions', newUserQuestions);
      this.action = fireLocalAction(this.componentId, 'loaded', true);
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
    if (keys.includes('questions')) console.log(componentState.questions);
    if (keys.includes('questionIds')) this.questionIds = componentState.questionIds;
    if (keys.includes('noUserQuestions')) this.noUserQuestions = componentState.noUserQuestions;
    if (keys.includes('error')) this.error = componentState.error;
    this.userToken = state.userToken;
    this.user = state.user;
  }

}

window.customElements.define(PrendusQuestionsView.is, PrendusQuestionsView)

async function getUserQuestions(userId: string, userToken: string) {
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

async function deleteQuestion(userId: String, userToken: string, questionId: string) {
    const data = await GQLRequest(`
      mutation deleteQuestion($questionId: ID!){
        deleteQuestion(id: $questionId){
          id
        }
      }
    `, {questionId}, userToken, (error: any) => {
      throw error;
    });
    return data.deleteQuestion.id;
}
