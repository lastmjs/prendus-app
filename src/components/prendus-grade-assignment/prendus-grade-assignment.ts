import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {User} from '../../typings/user';
import {createUUID, shuffleArray, asyncMap} from '../../services/utilities-service';
import {GQLrequest} from '../../services/graphql-service';
import {QuestionType, NotificationType} from '../../services/constants-service';
import {setNotification, getAndSetUser} from '../../redux/actions';
import {extractVariables} from '../../services/code-to-question-service';
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
  }

  _fireLocalAction(key: string, value: any) {
    this.action = {
      type: 'SET_COMPONENT_PROPERTY',
      componentId: this.componentId,
      key,
      value
    };
  }

  _handleGrades(e: CustomEvent) {
    this._fireLocalAction('grades', e.detail.scores);
  }

  _handleNextRequest(e: CustomEvent) {
    try {
      validate(this.rubric, this.grades);
      this._submit(this.grades, this.response.questionResponse.id, this.user.id);
    } catch (err) {
      this.action = setNotification(err.message, NotificationType.ERROR);
      return;
    }
    this.$.carousel.nextData();
  }

  _handleNextResponse(e: CustomEvent) {
    const response = e.detail.data;
    this._fireLocalAction('response', response);
    if (response) {
      //force rubric dropdowns to reset
      this._fireLocalAction('rubric', null);
      setTimeout(() => {
        this._fireLocalAction('rubric', this._parseRubric(response.questionResponse.question.code));
      });
    } else {
      this._finish();
    }
  }

  _finish() {

  }

  _parseRubric(code: string): Rubric {
    const { gradingRubric } = extractVariables(code);
    if (!gradingRubric) return {};
    return JSON.parse(gradingRubric.value);
  }

  async loadAssignment(assignmentId: string) {
    this.action = await getAndSetUser();
    const data = await GQLrequest(`query getAssignmentResponses($assignmentId: ID!, $userId: ID!) {
      assignment: Assignment(id: $assignmentId) {
        id
        title
        questionType
        grade
      }
      essays: allUserEssays(filter: {
        questionResponse: {
          author: {
            id: $userId
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
    if (data.errors) {
      this.action = setNotification(data.errors[0].message, NotificationType.ERROR);
      return;
    }
    const { assignment, essays } = data;
    const responses = essays ? shuffleArray(essays).slice(0, assignment.grade): [];
    this._fireLocalAction('assignment', assignment);
    this._fireLocalAction('responses', responses);
  }

  _questionText(text: string): string {
    if (!text) return '';
    return parse(text, null).ast[0].content.replace(/&lt;p&gt;|&lt;\/p&gt;&lt;p&gt;/g, '');
  }

  async _submit(grades: CategoryScore[], responseId: string, userId: string): Promise<boolean> {
    const data = await GQLrequest(`mutation gradeResponse($grades: [QuestionResponseRatingscoresCategoryScore!]!, $responseId: ID!, $userId: ID!) {
      createQuestionResponseRating(
        raterId: $userId,
        questionResponseId: $responseId,
        scores: $grades
      ) {
        id
      }
    }`, {grades, responseId, userId}, this.userToken);
    if (data.errors) {
      this.action = setNotification(data.errors[0].message, NotificationType.ERROR);
    }
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
    this.userToken = state.userToken;
    this.user = state.user;
  }

}

function validate(rubric: Rubric, grades: CategoryScore[]) {
  if (!grades) throw new Error('You must rate the question');
  if (grades.length !== Object.keys(rubric).length) throw new Error('You must rate each category');
  if (grades.reduce((bitOr, score) => bitOr || !rubric.hasOwnProperty(score.category) || score.score < 0, false))
    throw new Error('You must rate each category');
}

window.customElements.define(PrendusGradeAssignment.is, PrendusGradeAssignment)
