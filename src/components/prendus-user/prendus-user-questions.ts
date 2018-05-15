import {User, Question, Assignment, SetPropertyAction, SetComponentPropertyAction, DefaultAction} from '../../prendus.d';
import {createUUID, navigate, fireLocalAction, asyncForEach} from '../../node_modules/prendus-shared/services/utilities-service';
import {shuffleArray} from '../../services/utilities-service';
import {QuestionType, NotificationType, ContextType, VerbType, ObjectType} from '../../services/constants-service';
import {setNotification, getAndSetUser, checkForUserToken} from '../../redux/actions';
import {LTIPassback} from '../../services/lti-service';
import {sendStatement} from '../../services/analytics-service';
import {GQLRequest} from '../../node_modules/prendus-shared/services/graphql-service';

export class PrendusUserQuestions extends Polymer.Element {
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
  deleteItem: (questionId: string, userToken: string, questions: Question[]) => any[];

  static get is() { return 'prendus-user-questions' }

  static get properties() {
    return{
        userId: {
        type: String,
        observer: 'loadUser'
      },
      fetchQuestions: {
        type: Function,
        computed: 'computeFetchQuestions(user, userToken)'
      },
    }
  }

  constructor() {
    super();
    this.componentId = createUUID();
  }

  async connectedCallback() {
    super.connectedCallback();
    this.action = fireLocalAction(this.componentId, 'loaded', true);
  }

  async loadUser(){
    this.action = checkForUserToken();
    if(!this.user)
      this.action = await getAndSetUser();
  }
  openConfirmDeleteQuestionModal(e){
    this.shadowRoot.querySelector('#questionsList').shadowRoot.querySelector(`#${e.detail.questionId}`).open="false";
    this.shadowRoot.querySelector('#questionsList').shadowRoot.querySelector(`#${e.detail.questionId}`).open="true";
  }

  computeFetchQuestions(user: User, userToken: string): (i: number, n: number) => Promise<object> | void {
    //The load user function will check if the user is logged in. This ensures that the user is set before returning this function.
    //computeFetchQuestions gets called when the user gets set, so this just prevents the function from getting returned when the userToken is set
    if(user)
      return async (pageIndex: number, pageAmount: number) => getUserQuestions(
        user.id, userToken, pageIndex, pageAmount
      );
  };

  // async deleteQuestion(e: any){
  //   try{
  //     this.action = fireLocalAction(this.componentId, 'loaded', false);
  //     const questionId = e.target.id;
      // const deletedQuestionId = await deleteQuestion(questionId, this.userToken);
  //     this.action = fireLocalAction(this.componentId, 'deleteItem', async (questions: Question[]) => deleteQuestionFromGraphQLAndDOM(questionId, this.userToken, questions));
  //     this.action = fireLocalAction(this.componentId, 'loaded', true);
  //   }catch(error){
  //     console.log('error', error)
  //     this.action = setNotification(error.message, NotificationType.ERROR);
  //     this.action = fireLocalAction(this.componentId, 'loaded', true)
  //   }
  // }
  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    const keys = Object.keys(componentState);
    if (keys.includes('loaded')) this.loaded = componentState.loaded;
    if (keys.includes('questions')) this.questions = componentState.questions;
    if (keys.includes('questionIds')) this.questionIds = componentState.questionIds;
    if (keys.includes('noUserQuestions')) this.noUserQuestions = componentState.noUserQuestions;
    if (keys.includes('deleteItem')) this.deleteItem = componentState.deleteItem;
    if (keys.includes('error')) this.error = componentState.error;
    this.userToken = state.userToken;
    this.user = state.user;
  }

}

window.customElements.define(PrendusUserQuestions.is, PrendusUserQuestions)

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
    console.log('questions', data.allQuestions)
    return data.allQuestions;
}

async function deleteQuestionFromGraphQLAndDOM(questionId: string, userToken: string, questions: Question[]) {
  const deletedQuestionId =  await performGQLDeleteQuestionGraphQLMutation(questionId, userToken);
  console.log('deleteQuestionId', deletedQuestionId);
  return questions.filter((question: Question) => {
    return question.id === deletedQuestionId;
  })

}
async function performGQLDeleteQuestionGraphQLMutation(questionId: string, userToken: string){
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
