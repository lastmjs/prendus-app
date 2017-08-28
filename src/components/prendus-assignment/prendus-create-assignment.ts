import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {createUUID} from '../../node_modules/prendus-shared/services/utilities-service';
import {sendStatement} from '../../services/analytics-service';
import {ContextType, NotificationType, QuestionType} from '../../services/constants-service';
import {setNotification} from '../../redux/actions';
import {LTIPassback} from '../../services/lti-service';
import {User} from '../../typings/user';
import {Question} from '../../typings/question';
import {Assignment} from '../../typings/assignment';
import {GQLRequest} from '../../node_modules/prendus-shared/services/graphql-service';
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

  _handleGQLError(err: any) {
    this.action = setNotification(err.message, NotificationType.ERROR);
  }

  _handleNextQuestion(e: CustomEvent) {
    const { data } = e.detail;
    this._fireLocalAction('question', data);
    if (data && data === this.questions[0]) //first round started
      sendStatement(this.user.id, this.assignment.id, ContextType.ASSIGNMENT, 'STARTED', 'CREATE');
    else //subsequent rounds mean a question was created
      sendStatement(this.user.id, this.assignment.id, ContextType.ASSIGNMENT, 'CREATED', 'CREATE');
    if (!data) //last round
      LTIPassback(this.user.id, this.assignment.id, 'CREATE');
  }

  async _handleQuestion(e: CustomEvent) {
    const { question } = e.detail;
    const save = questionVars.conceptId ? this.saveQuestion.bind(this) : this.saveQuestionAndConcept.bind(this);
    const questionId = await save(questionVars);
    this.shadowRoot.querySelector('#carousel').nextData();
  }

  isEssayType(questionType: string): boolean {
    return questionType === QuestionType.ESSAY;
  }

  isMultipleChoiceType(questionType: string): boolean {
    return questionType === QuestionType.MULTIPLE_CHOICE;
  }

  async loadAssignment(assignmentId: string) {
    const data = await GQLRequest(`query getAssignment($assignmentId: ID!) {
      Assignment(id: $assignmentId) {
        id
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
    // avoid 0 because question is evaluated as a boolean
    const questions = Array(data.Assignment.numCreateQuestions).fill(null).map((dummy, i) => i+1);
    this._fireLocalAction('assignment', data.Assignment);
    this._fireLocalAction('questions', questions);
  }

  async saveQuestion(variables: GQLVariables): Promise<string|null> {
    const data = await GQLRequest(`mutation newQuestion($authorId: ID!, $conceptId: ID!, $resource: String!, $text: String!, $code: String!, $assignmentId: ID!, $imageIds: [ID!]!) {
      createQuestion(
        authorId: $authorId,
        conceptId: $conceptId,
        assignmentId: $assignmentId,
        resource: $resource,
        text: $text,
        code: $code,
        imagesIds: $imageIds
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
    this.userToken = state.userToken;
    this.user = state.user;
  }

}

window.customElements.define(PrendusCreateAssignment.is, PrendusCreateAssignment)
