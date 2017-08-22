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
    this.addEventListener('carousel-next', this._handleNextRequest.bind(this));
    this.addEventListener('carousel-data', this._handleNextResponse.bind(this));
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
    try {
      this._validate();
      this._submit();
    } catch (err) {
      this._fireLocalAction('error', e);
      return;
    }
    this.$.carousel.nextData();
  }

  _handleNextResponse(e) {
    this._fireLocalAction('response', e.detail.data);
  }

  _parseRubric(code: string): Object {
    const { gradingRubric } = extractLiteralVariables(code);
    if (!gradingRubric) return {};
    return JSON.parse(gradingRubric);
  }

  async loadAssignment(assignmentId: string): Assignment {
    const data = await GQLrequest(`query getAssignmentResponses($assignmentId: ID!, $userId: ID!) {
      assignment: Assignment(id: $assignmentId) {
        id
        title
        questionType
      }
      essays: allUserInputs(filter: {
        questionResponse: {
          author: {
            id_not: $userId
          }
          question: {
            assignment: {
              id: $assignmentId
            }
          }
        }
      }) {
        value
        questionResponse {
          id
          question {
            text
            code
          }
        }
      }
    }`, {assignmentId, userId: this.user.id}, this.userToken);
    const { assignment, essays } = data;
    const responses = essays ? shuffleArray(essays).slice(0, 3): [];//assignment.gradeQuota);
    this._fireLocalAction('assignment', assignment);
    this._fireLocalAction('responses', responses);
  }

  _questionText(text: string): string {
    if (!text) return '';
    return parse(text, null).ast[0].content.replace('<p>', '').replace('</p><p>', ''));
  }

  _validate() {
  }

  _handleSubmit(data: object) {
    return data;
  }

  _submit() {
    return Promise.all(this.grades.map(grade => {
      return this._createCategoryScore(grade);
    })).then(this._handleSubmit.bind(this))
  }

  _createCategoryScore(grade: object) {
    const query = `mutation gradeResponse($responseId: ID!, $category: String!, $score: Int!) {
      createCategoryScore (
        questionResponseId: $responseId
        category: $category
        score: $score
      ) {
        id
      }
    }`;
    const variables = {
      responseId: this.response.id,
      category: grade.category,
      score: grade.score
    };
    return GQLrequest(query, variables, this.userToken)
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    const keys = Object.keys(componentState);
    if (keys.includes('loaded')) this.loaded = componentState.loaded;
    if (keys.includes('assignment')) this.assignment = componentState.assignment;
    if (keys.includes('responses')) this.responses = componentState.responses;
    if (keys.includes('response')) this.response = componentState.response;
    if (keys.includes('rubric')) this.rubric = componentState.rubric;
    if (keys.includes('grades')) this.grades = componentState.grades;
    if (keys.includes('error')) this.error = componentState.error;
    this.userToken = state.userToken;
    this.user = state.user;
  }

}

window.customElements.define(PrendusGradeAssignment.is, PrendusGradeAssignment)
