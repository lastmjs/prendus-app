import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {User} from '../../typings/user';
import {createUUID, shuffleArray} from '../../services/utilities-service';
import {GQLrequest} from '../../services/graphql-service';
import {extractLiteralVariables} from '../../services/code-to-question-service';
import {parse} from '../../node_modules/assessml/assessml';

class PrendusGradeAssignment extends Polymer.Element {
  loaded: boolean;
  action: SetPropertyAction | SetComponentPropertyAction;
  componentId: string;
  userToken: string | null;
  user: User;

  static get is() { return 'prendus-grade-assignment' }

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
    this.addEventListener('rubric-dropdowns', this._handleGrades.bind(this));
    this.addEventListener('question-carousel-next', this._handleNextRequest.bind(this));
    this.addEventListener('question-carousel-question', this._handleNextQuestion.bind(this));
  }

  _fireLocalAction(key: string, value: any) {
    this.action = {
      type: 'SET_COMPONENT_PROPERTY',
      componentId: this.componentId,
      key,
      value
    };
  }

  _handleGrades(e) {
    this._fireLocalAction('grades', e.detail.scores);
  }

  _handleNextRequest(e) {
    if (this._valid(this.grades, this.rubric) && this._submit(this.question, this.grades))
      this.$.carousel.nextQuestion();
    else
      console.log('Error!');
  }

  _handleNextQuestion(e) {
    const { question } = e.detail;
    this._fireLocalAction('question', question);
    this._fireLocalAction('rubric', this._parseRubric(question.code));
  }

  _parseRubric(code: string): Object {
    const { gradingRubric } = extractLiteralVariables(code);
    return JSON.parse(gradingRubric);
  }

  async loadAssignment(assignmentId: string): Assignment {
    const data = await GQLrequest(`query getAssignment($assignmentId: ID!) {
      assignment: Assignment(id: $assignmentId) {
        id
        title
        questionType
        questions {
          id
          text
          code
        }
      }
    }`, {assignmentId}, this.userToken);
    const { assignment } = data;
    const questions = shuffleArray(assignment.questions).slice(0, 3);//assignment.gradeQuota);
    this._fireLocalAction('assignment', assignment);
    this._fireLocalAction('questions', questions);
  }

  _questionText(text: string): string {
    if (!text) return '';
    return parse(text, null).ast[0].content.replace('<p>', '').replace('</p><p>', ''));
  }

  _valid(grades: Object, rubric: Object) {
    return grades != undefined
      && Object.keys(rubric).reduce((bitAnd, category) => {
        return bitAnd && grades.hasOwnProperty(category) && grades[category] > -1
      }, true);
  }

  _handleSubmit(data: Object) {
    if (data.errors) throw new Error("Error saving question grade");
    return true;
  }

  _handleError(err) {
    console.error(err);
    return false;
  }

  _submit(question: Object, grades: Object) {
    //    if (!this._valid()) {
    //      console.log('invalid!'); //TODO: display error
    //      return;
    //    }
    //    const query = `mutation gradeQuestion($questionId: ID!, $gradeJson: Json!, $graderId: ID!) {
    //      createQuestionGrade (
    //        graderId: $raterId
    //        questionId: $questionId
    //        gradeJson: $gradeJson
    //      ) {
    //        id
    //      }
    //    }`;
    //    const variables = {
    //      questionId: question.id,
    //      gradeJson: JSON.stringify(grades),
    //      graderId: this.user.id
    //    };
    //    return GQLrequest(query, variables, this.userToken)
    //      .then(this._handleSubmit.bind(this))
    //      .catch(this._handleError);
    return true;
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    const keys = Object.keys(componentState);
    if (keys.includes('loaded')) this.loaded = componentState.loaded;
    if (keys.includes('assignment')) this.assignment = componentState.assignment;
    if (keys.includes('questions')) this.questions = componentState.questions;
    if (keys.includes('question')) this.question = componentState.question;
    if (keys.includes('rubric')) this.rubric = componentState.rubric;
    if (keys.includes('grades')) this.grades = componentState.grades;
    this.userToken = state.userToken;
    this.user = state.user;
  }

}

window.customElements.define(PrendusGradeAssignment.is, PrendusGradeAssignment)
