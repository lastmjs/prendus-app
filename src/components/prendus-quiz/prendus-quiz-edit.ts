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

class PrendusQuizEdit extends Polymer.Element {
  loaded: boolean;
  action: SetPropertyAction | SetComponentPropertyAction | DefaultAction;
  componentId: string;
  userToken: string;
  user: User;
  noUserQuizzes: boolean;
  quizId: string;
  quizIds: string[];
  quizTitle: string;
  userQuestions: Question[];
  quizQuestions: Question[];
  questionIds: string[];
  quizzes:  Quiz[];
  editTitle: boolean;

  static get is() { return 'prendus-quiz-edit' }

  static get properties() {
    return {
        quizId: {
          type: String,
          observer: 'loadQuiz'
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
    this.action = fireLocalAction(this.componentId, 'editTitle', true)
    this.loadUserQuestions();
    this.action = fireLocalAction(this.componentId, 'loaded', true)
  }

  async loadUserQuestions(){
    try{
      this.action = fireLocalAction(this.componentId, 'loaded', false)
      const userQuestions = await getUserQuestions(this.user.id, this.userToken);
      this.action = fireLocalAction(this.componentId, 'userQuestions', userQuestions)
      this.action = fireLocalAction(this.componentId, 'loaded', true)
    }catch(error){
      this.action = setNotification(error.message, NotificationType.ERROR);
      this.action = fireLocalAction(this.componentId, 'loaded', true)
    }
  }

  async loadQuiz(){
    try{
      this.action = fireLocalAction(this.componentId, 'loaded', false)
      const quiz = await getQuiz(this.quizId, this.userToken);
      this.action = fireLocalAction(this.componentId, 'quizQuestions', quiz.questions);
      this.action = fireLocalAction(this.componentId, 'quizTitle', quiz.title);
      this.action = fireLocalAction(this.componentId, 'loaded', true)
    }catch(error){
      this.action = setNotification(error.message, NotificationType.ERROR);
      this.action = fireLocalAction(this.componentId, 'loaded', true)
    }
  }

  addToQuiz(e: any){
    const questionToAddToQuiz = this.userQuestions.filter((question)=>{
      return e.detail.questionId == question.id;
    })[0];
    const newQuizQuestions = [
      ...this.quizQuestions,
      questionToAddToQuiz
    ];
    this.action = fireLocalAction(this.componentId, 'quizQuestions', newQuizQuestions);
    setTimeout(() => { //hack because the component won't show unless this is fired twice. Figure out the fix if iron-list doesn't fix this.
      this.action = fireLocalAction(this.componentId, 'quizQuestions', newQuizQuestions);
    }, 10)
  }
  removeFromQuiz(e:any){
    const newQuizQuestions = this.quizQuestions.reduce((newQuestions: object[], question: Question)=>{
      if(question.id !== e.detail.questionId) newQuestions.push(question);
      return newQuestions;
    },[]);
    this.action = fireLocalAction(this.componentId, 'quizQuestions', newQuizQuestions);
    setTimeout(() => { //hack because the component won't show unless this is fired twice. Figure out the fix if iron-list doesn't fix this.
      this.action = fireLocalAction(this.componentId, 'quizQuestions', newQuizQuestions);
    }, 10)
  }

  async saveQuiz(){
    const title = this.shadowRoot.querySelector('#quizInput').value;
    if(!title){
      this.action = setNotification("Quiz needs a title", NotificationType.ERROR)
      return;
    }
    if(this.quizQuestions[0] == null){
      this.action = setNotification("Quiz needs questions", NotificationType.ERROR)
      return;
    }
    //Logic to save the quiz if it exists, create the quiz if it does not.
    const quizQuestionIds = this.quizQuestions.map((question)=>{
      return question.id
    });
    const quizId = (this.quizId) ? await updateQuiz(this.quizId, quizQuestionIds, title, this.userToken) : await createQuiz(quizQuestionIds, title, this.user.id, this.userToken);
    this.action = fireLocalAction(this.componentId, 'quizId', quizId);
    navigate('/quizzes/view');
  }
  startEditingQuizTitle(){
    this.action = fireLocalAction(this.componentId, 'editTitle', true);
  }
  stopEditingQuizTitle(){
    this.action = fireLocalAction(this.componentId, 'editTitle', false);

  }
  async saveQuizTitle(e: CustomEvent){
    try{
      const title = this.shadowRoot.querySelector('#quizInput').value;
      const quizQuestionIds = this.quizQuestions.map((question)=>{
        return question.id
      });
      if(this.quizId && quizQuestionIds.length){
        await updateQuiz(this.quizId, quizQuestionIds, title, this.userToken)
        this.action = setNotification("Title updated.", NotificationType.SUCCESS);
      }else{
        (quizQuestionIds.length) ? this.action = setNotification("Click save to finish updating quiz.", NotificationType.SUCCESS) : this.action = setNotification("Add questions and click save to finish updating quiz.", NotificationType.SUCCESS);
      }
      this.action = fireLocalAction(this.componentId, 'quizTitle', title);
    }catch(error){
      console.log('error', error)
      this.action = setNotification("Error updating quiz title", NotificationType.ERROR)
    }
    this.stopEditingQuizTitle();
  }
  //Make this saveQuiz
  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    const keys = Object.keys(componentState);
    if (keys.includes('loaded')) this.loaded = componentState.loaded;
    if (keys.includes('quizTitle')) this.quizTitle = componentState.quizTitle;
    if (keys.includes('userQuestions')) this.userQuestions = componentState.userQuestions;
    if (keys.includes('quizQuestions')) this.quizQuestions = componentState.quizQuestions;
    if (keys.includes('editTitle')) this.editTitle = componentState.editTitle;
    if (keys.includes('quizId')) this.quizId = componentState.quizId;
    if (keys.includes('questionIds')) this.questionIds = componentState.questionIds;
    if (keys.includes('loaded')) this.loaded = componentState.loaded;
    this.userToken = state.userToken;
    this.user = state.user;
  }
}

window.customElements.define(PrendusQuizEdit.is, PrendusQuizEdit)

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
          explanation
        }
      }
    `, {userId}, userToken, (error: any) => {
      throw error;
    });
    return data.allQuestions;
}

async function getQuiz(quizId: String, userToken: String) {
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

async function createQuiz(questionIds: string[], title: string, userId: string, userToken: string): Promise<Question[]> {
  const data = await GQLRequest(`
    mutation quiz($userId: ID!, $title: String!, $questionIds: [ID!]!){
      createQuiz(
        authorId: $userId
        title: $title
        questionsIds: $questionIds
      ){
        id
        questions {
          id
          text
          code
        }
      }
  }`, {questionIds, title, userId}, userToken, (error: any) => {
    throw error;
  });
  if (!data) {
    return [];
  }
  navigate(`/quiz/${data.createQuiz.id}/edit`);
}

async function updateQuiz(quizId: string, questionIds: string[], title: string, userToken: string): Promise<Question[]> {
  const data = await GQLRequest(`
    mutation quiz($quizId: ID!, $title: String!, $questionIds: [ID!]!){
      updateQuiz(
        id: $quizId
        title: $title
        questionsIds: $questionIds
      ){
        id
        questions {
          id
          text
          code
        }
      }
  }`, {questionIds, title, quizId}, userToken, (error: any) => {
    throw error;
  });
  if (!data) {
    return [];
  }
  return data.updateQuiz.id;
}
