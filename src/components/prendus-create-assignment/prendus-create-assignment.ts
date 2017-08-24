import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {createUUID, asyncForEach} from '../../services/utilities-service';
import {sendStatement} from '../../services/analytics-service';
import {ContextType, NotificationType} from '../../services/constants-service';
import {setNotification} from '../../redux/actions';
import {User} from '../../typings/user';
import {Question} from '../../typings/question';
import {Assignment} from '../../typings/assignment';
import {GQLrequest} from '../../services/graphql-service';
import {GQLVariables} from '../../typings/gql-variables';

class PrendusCreateAssignment extends Polymer.Element {
  loaded: boolean;
  action: SetPropertyAction | SetComponentPropertyAction;
  componentId: string;
  assignment: Assignment;
  questions: Question[];
  question: Question;
  userToken: string | null;
  user: User;

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
    this._fireLocalAction('loaded', true);
  }

  _fireLocalAction(key: string, value: any) {
    this.action = {
      type: 'SET_COMPONENT_PROPERTY',
      componentId: this.componentId,
      key,
      value
    };
  }

  _handleNextQuestion(e: CustomEvent) {
    this._fireLocalAction('question', e.detail.data);
  }

  async _handleQuestion(e: CustomEvent) {
    const { question } = e.detail;
    const { answerComments ...questionVars } = question;
    const save = questionVars.conceptId ? this.saveQuestion.bind(this) : this.saveQuestionAndConcept.bind(this);
    const questionId = await save(questionVars);
    sendStatement(this.user.id, this.assignment.id, ContextType.ASSIGNMENT, "SUBMITTED", "CREATE")
    //window.fetch(`${getPrendusLTIServerOrigin()}/lti/grade-passback`, {
    //    method: 'post',
    //    mode: 'no-cors',
    //    credentials: 'include'
    //});
    if (answerComments)
      asyncForEach(answerComments.map(text => {
        return { text, questionId }
      }), this.saveAnswerComment);
    this.shadowRoot.querySelector('#carousel').nextData();
  }

  isEssayType(questionType: string): boolean {
    return questionType === 'ESSAY';
  }

  isMultipleChoiceType(questionType: string): boolean {
    return questionType === 'MULTIPLE_CHOICE';
  }

  async loadAssignment(assignmentId: string) {
    const data = await GQLrequest(`query getAssignment($assignmentId: ID!) {
      Assignment(id: $assignmentId) {
        id
        title
        create
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
    }`, {assignmentId}, this.userToken);
    if (data.errors) {
      this.action = setNotification(data.errors[0].message, NotificationType.ERROR);
      return;
    }
    // Create array of "questions" just to create carousel events to create multiple questions
    // avoid 0 because question is evaluated as a boolean
    const questions = Array(data.Assignment.create).fill(null).map((dummy, i) => i+1);
    this._fireLocalAction('assignment', data.Assignment);
    this._fireLocalAction('questions', questions);
  }

  async saveQuestion(variables: GQLVariables): Promise<string|null> {
    const data = await GQLrequest(`mutation newQuestion($authorId: ID!, $conceptId: ID!, $resource: String!, $text: String!, $code: String!, $assignmentId: ID!) {
      createQuestion(
        authorId: $authorId,
        conceptId: $conceptId,
        assignmentId: $assignmentId,
        resource: $resource,
        text: $text,
        code: $code
      ) {
        id
      }
    }`, variables, this.userToken);
    if (data.errors) {
      this.action = setNotification(data.errors[0].message, NotificationType.ERROR);
      return null;
    }
    return data.createQuestion.id;
  }

  async saveQuestionAndConcept(variables: GQLVariables): Promise<string|null> {
    const data = await GQLrequest(`mutation newQuestion($authorId: ID!, $concept: QuestionconceptConcept!, $resource: String!, $text: String!, $code: String!, $assignmentId: ID!) {
      createQuestion(
        authorId: $authorId,
        assignmentId: $assignmentId,
        concept: $concept,
        resource: $resource,
        text: $text,
        code: $code
      ) {
        id
      }
    }`, variables, this.userToken);
    if (data.errors) {
      this.action = setNotification(data.errors[0].message, NotificationType.ERROR);
      return null;
    }
    return data.createQuestion.id;
  }

  async saveAnswerComment(variables: GQLVariables): Promise<string|null> {
    const data = await GQLrequest(`mutation newAnswerComment($text: String!, $questionId: ID!) {
      createAnswerComment(text: $text, questionId: $questionId) {
        id
      }
    }`, variables);
    if (data.errors) {
      this.action = setNotification(data.errors[0].message, NotificationType.ERROR);
      return null;
    }
    return data.createAnswerComment.id;
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    const keys = Object.keys(componentState);
    if (keys.includes('loaded')) this.loaded = componentState.loaded;
    if (keys.includes('assignment')) this.assignment = componentState.assignment;
    if (keys.includes('questions')) this.questions = componentState.questions;
    if (keys.includes('question')) this.question = componentState.question;
    this.userToken = state.userToken;
    this.user = state.user;
  }

}

window.customElements.define(PrendusCreateAssignment.is, PrendusCreateAssignment)
