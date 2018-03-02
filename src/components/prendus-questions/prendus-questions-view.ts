import {SetPropertyAction, SetComponentPropertyAction, DefaultAction} from '../../prendus.d';
import {User, Question, Assignment} from '../../prendus.d';
import {createUUID, navigate, fireLocalAction, asyncForEach} from '../../node_modules/prendus-shared/services/utilities-service';
import {shuffleArray} from '../../services/utilities-service';
import {QuestionType, NotificationType, ContextType, VerbType, ObjectType} from '../../services/constants-service';
import {setNotification, getAndSetUser, checkForUserToken} from '../../redux/actions';
import {LTIPassback} from '../../services/lti-service';
import {sendStatement} from '../../services/analytics-service';
import {GQLRequest} from '../../node_modules/prendus-shared/services/graphql-service';

export class PrendusQuestionsView extends Polymer.Element {
  loaded: boolean;
  action: SetPropertyAction | SetComponentPropertyAction | DefaultAction;
  componentId: string;
  userToken: string;
  user: User;
  userId: string;
  noUserQuestions: boolean;
  questionIds: string[];
  questions:  Question[];
  fetchQuestions: (pageIndex: number, pageAmount: number) => any[];
  deletedQuestionId: string;

  static get is() { return 'prendus-questions-view' }

  static get properties() {
    return{
        userId: {
        type: String
      },
      fetchQuestions: {
        type: Function,
        computed: '_computeFetchQuestions(user, userToken)'
      },
    }
  }

  constructor() {
    super();
    this.componentId = createUUID();
  }

  async connectedCallback() {
    super.connectedCallback();
  }


  openConfirmDeleteQuestionModal(e){
    this.shadowRoot.querySelector('#questionsList').shadowRoot.querySelector(`#${e.detail.questionId}`).open="false";
    this.shadowRoot.querySelector('#questionsList').shadowRoot.querySelector(`#${e.detail.questionId}`).open="true";
  }

  _computeFetchQuestions(user: User, userToken: string): (i: number, n: number) => Promise<object> | void {
    //TODO Need to make sure that the user is set right here - we need to pull questions based on a userId
    return async (pageIndex: number, pageAmount: number) => getUserQuestions(
      user.id, userToken, pageIndex, pageAmount
    );
  }

  async deleteQuestion(e: any){
    try{
      this.action = fireLocalAction(this.componentId, 'loaded', false);
      const questionId = e.target.id;
      const deletedQuestionId = await deleteQuestion(this.userToken, questionId);
      this.action = fireLocalAction(this.componentId, 'deletedQuestionId', deletedQuestionId);
      //Just raise an event notifiying the infinite list of the deleted item
      questionElement.parentNode.removeChild(questionElement);
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
    if (keys.includes('questionIds')) this.questionIds = componentState.questionIds;
    if (keys.includes('noUserQuestions')) this.noUserQuestions = componentState.noUserQuestions;
    if (keys.includes('deletedQuestion')) this.deletedQuestion = componentState.deletedQuestion;
    if (keys.includes('error')) this.error = componentState.error;
    this.userToken = state.userToken;
    this.user = state.user;
  }

}

window.customElements.define(PrendusQuestionsView.is, PrendusQuestionsView)

async function getUserQuestions(userId: string, userToken: string, pageIndex: number, pageAmount: number) {
    const data = await GQLRequest(`
      query getQuestions($userId: ID!, $pageIndex: Int!, $pageAmount: Int!) {
        allQuestions(
          skip: $pageIndex
          first: $pageAmount
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
    `, {userId, pageIndex, pageAmount}, userToken, (error: any) => {
      throw error;
    });
    return data.allQuestions;
}

async function deleteQuestion(questionId: string, userToken: string) {
  const data = await GQLRequest(`
    mutation deleteQuestion($questionId: ID!){
      deleteQuestion(id: $questionId){
        id
      }
    }
  `, {questionId}, userToken, (error: any) => {
    console.log('error', error)
    throw error;
  });
  return data.deleteQuestion.id;
}
