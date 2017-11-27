import {
  createUUID,
  fireLocalAction
} from '../../node_modules/prendus-shared/services/utilities-service';
import {
  QuestionType,
  VerbType,
} from '../../services/constants-service';
import {
  setNotification,
} from '../../redux/actions';
import {
  GQLRequest
} from '../../node_modules/prendus-shared/services/graphql-service';

class PrendusCreateAssignment extends Polymer.Element {
  loaded: boolean;
  action: SetPropertyAction | SetComponentPropertyAction | DefaultAction;
  componentId: string;
  assignment: Assignment,
  question: number; //index
  questions: string[]; //ids of created questions
  userToken: string;
  submit: (item: object) => Promise<string>;
  load: (assignmentId: string) => Promise<object>;

  static get is() { return 'prendus-create-assignment' }

  static get properties() {
    return {
      assignmentId: String
    }
  }

  constructor() {
    super();
    this.componentId = createUUID();
  }

  connectedCallback() {
    super.connectedCallback();
    this.action = fireLocalAction(this.componentId, 'load', this._load.bind(this));
    this.action = fireLocalAction(this.componentId, 'submit', this._submit.bind(this));
  }

  async _load(assignmentId: string): Promise<string> {
    const assignment = await loadAssignment(assignmentId);
    this.action = fireLocalAction(this.componentId, 'assignment', assignment);
    const questions = (new Array(assignment.numCreateQuestions)).fill(null).map((_, i) => i);
    return {
      title: assignment.title + ' Create Assignment',
      courseId: assignment.course.id,
      items: questions,
      taken: false,
    };
  }

  async _submit(i: number): Promise<string> {
    return this.questions[i];
  }

  _question(e: CustomEvent) {
    this.action = fireLocalAction(this.componentId, 'question', e.detail.value);
  }

  async _handleQuestion(e: CustomEvent) {
    const { question } = e.detail;
    const save = question.conceptId ? saveQuestion : saveQuestionAndConcept;
    const questionId = await save(question);
    const questions = [ ...this.questions, questionId ];
    this.action = fireLocalAction(this.componentId, 'questions', questions);
    this.shadowRoot.querySelector('#carousel')._notifyNext(); //This call will be unnecessary when the create assignment uses the editor
  }

  isEssayType(questionType: string): boolean {
    return questionType === QuestionType.ESSAY;
  }

  isMultipleChoiceType(questionType: string): boolean {
    return questionType === QuestionType.MULTIPLE_CHOICE;
  }

  _handleGQLError(err: any) {
    this.action = setNotification(err.message, NotificationType.ERROR);
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    this.loaded = componentState.loaded;
    this.assignment = componentState.assignment;
    this.question = componentState.question;
    this.questions = componentState.questions;
    this.load = componentState.load;
    this.submit = componentState.submit;
    this.userToken = state.userToken;
  }

}

async function loadAssignment(assignmentId: string, userToken: string, handleError: (err: any) => void): Promise<Assignment> {
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
  }`, {assignmentId}, userToken, handleError);
  return data.Assignment;
}

async saveQuestion(variables: object, userToken: string, handleError: (err: any) => void): Promise<string> {
  const data = await GQLRequest(`mutation newQuestion(
    $authorId: ID!,
    $conceptId: ID!
    $resource: String!
    $text: String!
    $code: String!
    $assignmentId: ID!
    $imageIds: [ID!]!
    $answerComments: [QuestionanswerCommentsAnswerComment!]!
  ) {
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
  }`, variables, userToken, handleError);
  return data.createQuestion.id;
}

async saveQuestionAndConcept(variables: object, userToken: string, handleError: (err: any) => void): Promise<string> {
  const data = await GQLRequest(`mutation newQuestion(
    $authorId: ID!,
    $concept: QuestionconceptConcept!,
    $resource: String!,
    $text: String!,
    $code: String!,
    $assignmentId: ID!,
    $answerComments: [QuestionanswerCommentsAnswerComment!]!
  ) {
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
  }`, variables, userToken, handleError);
  return data.createQuestion.id;
}

window.customElements.define(PrendusCreateAssignment.is, PrendusCreateAssignment)
