import {SetPropertyAction, SetComponentPropertyAction, DefaultAction} from '../../typings/actions';
import {createUUID, navigate, isUserAuthorizedOnCourse, getCourseIdFromAssignmentId, getCookie} from '../../node_modules/prendus-shared/services/utilities-service';
import {sendStatement} from '../../services/analytics-service';
import {ContextType, NotificationType, QuestionType, VerbType, ObjectType} from '../../services/constants-service';
import {setNotification, getAndSetUser, checkForUserToken} from '../../redux/actions';
import {LTIPassback} from '../../services/lti-service';
import {User} from '../../typings/user';
import {Question} from '../../typings/question';
import {Assignment} from '../../typings/assignment';
import {GQLRequest} from '../../node_modules/prendus-shared/services/graphql-service';
import {GQLVariables} from '../../typings/gql-variables';

class PrendusCreateAssignment extends Polymer.Element {
  loaded: boolean;
  action: SetPropertyAction | SetComponentPropertyAction | DefaultAction;
  componentId: string;
  assignment: Assignment;
  questions: Question[];
  question: Question;
  userToken: string;
  user: User;
  finished: boolean;

  static get is() { return 'prendus-create-assignment' }

  static get properties() {
    return {
      assignmentId: {
        type: String,
        observer: 'loadAssignment'
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

  _fireLocalAction(key: string, value: any) {
    this.action = {
      type: 'SET_COMPONENT_PROPERTY',
      componentId: this.componentId,
      key,
      value
    };
  }

  _handleGQLError(err: any) {
    this.action = setNotification(err.message, NotificationType.ERROR);
  }

  async _handleNextQuestion(e: CustomEvent) {
    const i = e.detail.value;
    this._fireLocalAction('question', i);
    const statement = { userId: this.user.id, assignmentId: this.assignment.id, courseId: this.assignment.course.id };
    if (i !== undefined && i === this.questions[0]) //first round started
      await sendStatement(this.userToken, { ...statement, verb: VerbType.STARTED });
    else if (i === undefined && this.questions.length) {
      await sendStatement(this.userToken, { ...statement, verb: VerbType.SUBMITTED });
      this.gradePassback();
    }
  }

  async gradePassback() {
    try {
      await LTIPassback(this.userToken, getCookie('ltiSessionIdJWT'));
      this.action = setNotification('Grade passback succeeded.', NotificationType.SUCCESS);
    }
    catch(error) {
      this.action = setNotification('Grade passback failed. Retrying...', NotificationType.ERROR);
      setTimeout(() => {
          this.gradePassback();
      }, 5000);
    }
  }

  async _handleFinished(e: CustomEvent) {
    this._fireLocalAction('finished', e.detail.value);
  }

  async _handleQuestion(e: CustomEvent) {
    const { question } = e.detail;
    const save = question.conceptId ? this.saveQuestion.bind(this) : this.saveQuestionAndConcept.bind(this);
    const questionId = await save(question);
    const statement = { userId: this.user.id, assignmentId: this.assignment.id, courseId: this.assignment.course.id };
    await sendStatement(this.userToken, { ...statement, verb: VerbType.CREATED, questionId });
    this.shadowRoot.querySelector('#carousel').next();
  }

  isEssayType(questionType: string): boolean {
    return questionType === QuestionType.ESSAY;
  }

  isMultipleChoiceType(questionType: string): boolean {
    return questionType === QuestionType.MULTIPLE_CHOICE;
  }

  async loadAssignment(assignmentId: string) {
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

          const data = await GQLRequest(`query getAssignment($assignmentId: ID!) {
            Assignment(id: $assignmentId) {
              id
              course {
                id
              }
              title
              numCreateQuestions
              questionType
              concepts {
                id
                title
              }
              course {
                subject {
                  id
                }
              }
            }
          }`, {assignmentId}, this.userToken, this._handleGQLError.bind(this));
          if (!data) {
            return;
          }

          // Create array of "questions" just to create carousel events to create multiple questions
          const questions = Array(data.Assignment.numCreateQuestions).fill(null).map((_, i) => i);
          this._fireLocalAction('assignment', data.Assignment);
          this._fireLocalAction('questions', questions);
          this._fireLocalAction('loaded', true);
      });
  }

  continueToHome(){
      this.shadowRoot.querySelector("#unauthorizedAccessModal").close();
      navigate('/');
    }

  async saveQuestion(variables: GQLVariables): Promise<string|null> {
    const data = await GQLRequest(`mutation newQuestion($authorId: ID!, $conceptId: ID!, $resource: String!, $text: String!, $code: String!, $assignmentId: ID!, $imageIds: [ID!]!, $answerComments: [QuestionanswerCommentsAnswerComment!]!) {
      createQuestion(
        authorId: $authorId,
        conceptId: $conceptId,
        assignmentId: $assignmentId,
        resource: $resource,
        text: $text,
        code: $code,
        imagesIds: $imageIds
        answerComments: $answerComments
      ) {
        id
      }
    }`, variables, this.userToken, this._handleGQLError.bind(this));
    if (!data) {
      return null;
    }
    return data.createQuestion.id;
  }

  async saveQuestionAndConcept(variables: GQLVariables): Promise<string|null> {
    const data = await GQLRequest(`mutation newQuestion($authorId: ID!, $concept: QuestionconceptConcept!, $resource: String!, $text: String!, $code: String!, $assignmentId: ID!, $answerComments: [QuestionanswerCommentsAnswerComment!]!) {
      createQuestion(
        authorId: $authorId,
        assignmentId: $assignmentId,
        concept: $concept,
        resource: $resource,
        text: $text,
        code: $code
        answerComments: $answerComments
      ) {
        id
      }
    }`, variables, this.userToken, this._handleGQLError.bind(this));
    if (!data) {
      return null;
    }
    return data.createQuestion.id;
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    const keys = Object.keys(componentState);
    if (keys.includes('loaded')) this.loaded = componentState.loaded;
    if (keys.includes('assignment')) this.assignment = componentState.assignment;
    if (keys.includes('questions')) this.questions = componentState.questions;
    if (keys.includes('question')) this.question = componentState.question;
    if (keys.includes('finished')) this.finished = componentState.finished;
    this.userToken = state.userToken;
    this.user = state.user;
  }

}

window.customElements.define(PrendusCreateAssignment.is, PrendusCreateAssignment)
