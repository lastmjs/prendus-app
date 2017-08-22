import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {createUUID} from '../../services/utilities-service';
import {User} from '../../typings/user';
import {GQLrequest} from '../../services/graphql-service';

class PrendusCreateAssignment extends Polymer.Element {
  loaded: boolean;
  action: SetPropertyAction | SetComponentPropertyAction;
  componentId: string;
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
    this.addEventListener('carousel-data', (e) => {
      this._fireLocalAction('question', e.detail.data);
    });
    this.addEventListener('question-created', this._handleQuestion.bind(this));
  }

  _fireLocalAction(key: string, value: any) {
    this.action = {
      type: 'SET_COMPONENT_PROPERTY',
      componentId: this.componentId,
      key,
      value
    };
  }

  async _handleQuestion(e) {
    const { question } = e.detail;
    const { answerComments ...questionVars } = question;
    const save = questionVars.conceptId ? this.saveQuestion.bind(this) : this.saveQuestionAndConcept.bind(this);
    console.log(question);
    const questionId = await save(questionVars);
    if (answerComments)
      answerComments.forEach(comment => { this.saveAnswerComment({ text: comment, questionId }) });
    this.$.carousel.nextData();
  }

  isEssayType(questionType: string): boolean {
    return questionType === 'ESSAY';
  }

  isMultipleChoiceType(questionType: string): boolean {
    return questionType === 'MULTIPLE_CHOICE';
  }

  async loadAssignment(assignmentId: string): Assignment {
    const data = await GQLrequest(`query getAssignment($assignmentId: ID!) {
      Assignment(id: $assignmentId) {
        id
        title
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
    const questions = [{}]; //TODO: Fill array to match create quota
    this._fireLocalAction('assignment', data.Assignment);
    this._fireLocalAction('questions', questions);
  }

  async saveQuestion(variables): Promise<Object> {
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
    return data.createQuestion.id;
  }

  async saveQuestionAndConcept(variables): Promise<Object> {
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
    return data.createQuestion.id;
  }

  async saveConcept(variables: Object): Promise<Object> {
    const data = await GQLrequest(`mutation newConcept($title: String!, $subjectId: ID!) {
      createConcept(title: $title, subjectId: $subjectId) {
        id
      }
    }`, variables, this.userToken);
    return data.createConcept.id;
  }

  async saveAnswerComment(variables: Object): Promise<Object> {
    const data = await GQLrequest(`mutation newAnswerComment($text: String!, $questionId: ID!) {
      createAnswerComment(text: $text, questionId: $questionId) {
        id
      }
    }`, variables, this.userToken);
    return data.createAnswerComment.id;
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    const keys = Object.keys(componentState);
    const oldQuestion = this.question;
    if (keys.includes('loaded')) this.loaded = componentState.loaded;
    if (keys.includes('assignment')) this.assignment = componentState.assignment;
    if (keys.includes('questions')) this.questions = componentState.questions;
    if (keys.includes('question')) this.question = componentState.question;
    this.userToken = state.userToken;
    this.user = state.user;
  }

}

window.customElements.define(PrendusCreateAssignment.is, PrendusCreateAssignment)
