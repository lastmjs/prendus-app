import {SetPropertyAction, SetComponentPropertyAction, DefaultAction} from '../../typings/actions';
import {User} from '../../typings/user';
import {Question} from '../../typings/question';
import {GQLVariables} from '../../typings/gql-variables';
import {createUUID, navigate, getCourseIdFromAssignmentId, isUserAuthorizedOnCourse} from '../../node_modules/prendus-shared/services/utilities-service';
import {shuffleArray} from '../../services/utilities-service'; //TODO: Move into prendus-shared when Jordan is back
import {QuestionType, NotificationType, ContextType, VerbType, ObjectType} from '../../services/constants-service';
import {setNotification, getAndSetUser, checkForUserToken} from '../../redux/actions';
import {LTIPassback} from '../../services/lti-service';
import {sendStatement} from '../../services/analytics-service';
import {GQLRequest} from '../../node_modules/prendus-shared/services/graphql-service';
import {Assignment} from '../../typings/assignment'
class PrendusTakeAssignment extends Polymer.Element {
  loaded: boolean;
  action: SetPropertyAction | SetComponentPropertyAction | DefaultAction;
  componentId: string;
  userToken: string;
  user: User;
  assignment: Assignment;
  flagQuestionModalOpened: boolean;
  question: Question;
  questions:  Question[];
  static get is() { return 'prendus-take-assignment' }

  static get properties() {
    return {
      assignmentId: {
        type: String,
        observer: 'generateQuiz'
      }
    }
  }

  constructor() {
    super();
    this.componentId = createUUID();
  }

  connectedCallback() {
    super.connectedCallback();
  }

  _handleResponse(e: CustomEvent) {
    try {
      if (this.assignment.questionType === QuestionType.ESSAY)
        validateEssay(e.detail.userEssays);
      else if (this.assignment.questionType === QuestionType.MULTIPLE_CHOICE)
        validateMultipleChoice(e.detail.userRadios);
      this._saveResponse({
        ...e.detail,
        questionId: this.question.id,
        authorId: this.user.id
      });
    } catch (err) {
      alert(err.message);
      return;
    }
  }

  continueToHome(){
      this.shadowRoot.querySelector("#unauthorizedAccessModal").close();
      navigate('/');
    }

  _handleNextQuestion(e: CustomEvent) {
    const { data } = e.detail;
    this._fireLocalAction('question', data);
    if (data && data === this.questions[0])
      sendStatement(this.userToken, this.user.id, this.assignment.id, ContextType.QUIZ, VerbType.STARTED, ObjectType.QUIZ);
    else
      sendStatement(this.userToken, this.user.id, this.assignment.id, ContextType.QUIZ, VerbType.RESPONDED, ObjectType.QUIZ);
    if (!data)
      LTIPassback(this.userToken, this.user.id, this.assignment.id, ContextType.QUIZ);
  }

  _fireLocalAction(key: string, value: any) {
    this.action = {
      type: 'SET_COMPONENT_PROPERTY',
      componentId: this.componentId,
      key,
      value
    };
  }

  _nextClick() {
      this.shadowRoot.querySelector('#carousel').nextData();
  }
  _openFlagQuestionModal(){
    this._fireLocalAction('flagQuestionModalOpened', true);
  }
  _closeFlagQuestionModal(){
    this._fireLocalAction('flagQuestionModalOpened', false);
  }
  _handleError(err: any) {
    this.action = setNotification(err.message, NotificationType.ERROR);
  }
  async createQuestionFlag(){
    const comment = this.shadowRoot.querySelector('#flag-response').value
    const questionId = this.question.id;
    const data = await GQLRequest(`
      mutation questionFlag($comment: String!, $questionId: ID!){
        createQuestionFlag(
          comment: $comment
          questionId: $questionId
        ) {
        id
      }
    }`, {comment, questionId}, this.userToken, this._handleError.bind(this));
    this._fireLocalAction('flagQuestionModalOpened', false)
    this.action = setNotification("Question Flagged", NotificationType.ERROR);
    this.shadowRoot.querySelector('#carousel').nextData();
  }

  async generateQuiz(assignmentId: string) {
      this._fireLocalAction('loaded', true);
      setTimeout(async () => {
          this._fireLocalAction('loaded', false);

          this.action = checkForUserToken();
          this.action = await getAndSetUser();

          if (!this.user) {
              navigate('/authenticate');
              return;
          }

          const courseId = await getCourseIdFromAssignmentId(assignmentId, this.userToken);
          const {userOnCourse, userPaidForCourse} = await isUserAuthorizedOnCourse(this.user.id, this.userToken, assignmentId, courseId);

          if (!userOnCourse) {
              this.shadowRoot.querySelector("#unauthorizedAccessModal").open();
              return;
          }

          if (!userPaidForCourse) {
              navigate(`/course/${courseId}/payment?redirectUrl=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}`);
              return;
          }

          const assignment = await this._assignment(assignmentId);
          this._fireLocalAction('assignment', assignment);
          const questionIds = shuffleArray(assignment.questions).slice(0, assignment.numResponseQuestions).map(question => question.id);
          const questions = await this._createQuiz(questionIds, this.user.id);
          this._fireLocalAction('questions', questions);
          this._fireLocalAction('loaded', true);
      });
  }

  async _assignment(assignmentId: string): Promise<Assignment> {
    const data = await GQLRequest(`
        query getAssignment($assignmentId: ID!, $userId: ID!) {
      assignment: Assignment(id: $assignmentId) {
        id
        title
        numResponseQuestions
        questionType
        questions(filter: {
          AND: [{
            author: {
              id_not: $userId
            }
          }, {
            ratings_some: {}
          }, {
            	ratings_every: {
                scores_some: {
                  category: "Inclusion"
                  score_gt: 1
                }
              }
          }, {
            flags_none: {}
          }]
        }) {
          id
      		ratings {
      			scores {
      			  id
              category
              score
      			}
    			}
        }
      }
    }
    `, {assignmentId, userId: this.user.id}, this.userToken, this._handleError.bind(this));
    if (!data) {
      return;
    }
    return data.assignment;
  }

  async _createQuiz(questionIds: string[], userId: string): Promise<Question[]> {
    const data = await GQLRequest(`
      mutation quiz($userId: ID!, $questionIds: [ID!]!){
        createQuiz(
          authorId: $userId
          title: "Assignment Quiz"
          questionsIds: $questionIds
        ) {
        questions {
          id
          text
          code
        }
      }
    }`, {questionIds, userId}, this.userToken, this._handleError.bind(this));
    if (!data) {
      return [];
    }
    return data.createQuiz.questions;
  }

  async _saveResponse(variables: GQLVariables) {
    const query = `mutation answerQuestion(
        $questionId: ID!,
        $userInputs: [QuestionResponseuserInputsUserInput!]!,
        $userEssays: [QuestionResponseuserEssaysUserEssay!]!,
        $userVariables: [QuestionResponseuserVariablesUserVariable!]!,
        $userChecks: [QuestionResponseuserChecksUserCheck!]!,
        $userRadios: [QuestionResponseuserRadiosUserRadio!]!,
        $authorId: ID!
      ) {
      createQuestionResponse (
        authorId: $authorId
        questionId: $questionId
        userInputs: $userInputs
        userEssays: $userEssays
        userVariables: $userVariables
        userRadios: $userRadios
        userChecks: $userChecks
      ) {
        id
      }
    }`;
    return GQLRequest(query, variables, this.userToken, this._handleError.bind(this));
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    const keys = Object.keys(componentState);
    if (keys.includes('loaded')) this.loaded = componentState.loaded;
    if (keys.includes('assignment')) this.assignment = componentState.assignment;
    if (keys.includes('questions')) this.questions = componentState.questions;
    if (keys.includes('question')) this.question = componentState.question;
    if (keys.includes('error')) this.error = componentState.error;
    if (keys.includes('flagQuestionModalOpened')) this.flagQuestionModalOpened = componentState.flagQuestionModalOpened;
    this.userToken = state.userToken;
    this.user = state.user;
  }

}

function validateEssay(essays: UserEssay[]) {
  if (!essays.length || !essays[0].value || !essays[0].value.trim().length)
    throw new Error('Your essay response is empty');
}

function validateMultipleChoice(radios: UserRadio[]) {
  if (!radios.length || !radios.reduce((bitOr, radio) => bitOr || radio.checked, false))
    throw new Error('You must select an answer');
}

window.customElements.define(PrendusTakeAssignment.is, PrendusTakeAssignment)
