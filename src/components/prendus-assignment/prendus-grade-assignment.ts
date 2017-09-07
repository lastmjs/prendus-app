import {SetPropertyAction, SetComponentPropertyAction, DefaultAction} from '../../typings/actions';
import {User} from '../../typings/user';
import {createUUID, shuffleArray, asyncMap, navigate, getCourseIdFromAssignmentId, isUserAuthorizedOnCourse} from '../../node_modules/prendus-shared/services/utilities-service';
import {GQLRequest} from '../../node_modules/prendus-shared/services/graphql-service';
import {QuestionType, NotificationType, ContextType, VerbType, ObjectType} from '../../services/constants-service';
import {setNotification, getAndSetUser, checkForUserToken} from '../../redux/actions';
import {sendStatement} from '../../services/analytics-service';
import {LTIPassback} from '../../services/lti-service';
import {extractVariables} from '../../services/code-to-question-service';
import {parse} from '../../node_modules/assessml/assessml';

class PrendusGradeAssignment extends Polymer.Element {
  loaded: boolean;
  action: SetPropertyAction | SetComponentPropertyAction | DefaultAction;
  componentId: string;
  userToken: string;
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
    this.shadowRoot.querySelector('#carousel').nextData();
  }

  _handleNextResponse(e: CustomEvent) {
    const response = e.detail.data;
    this._fireLocalAction('response', response);
    if (response && response === this.responses[0])
      sendStatement(this.userToken, this.user.id, this.assignment.id, ContextType.ASSIGNMENT, VerbType.STARTED, ObjectType.GRADE);
    else
      sendStatement(this.userToken, this.user.id, this.assignment.id, ContextType.ASSIGNMENT, VerbType.GRADED, ObjectType.GRADE);
    if (response) {
      //force rubric dropdowns to reset
      this._fireLocalAction('rubric', null);
      setTimeout(() => {
        this._fireLocalAction('rubric', this._parseRubric(response.questionResponse.question.code));
      });
    } else {
      LTIPassback(this.user.id, this.assignment.id, 'GRADE');
    }
  }

  _parseRubric(code: string): Rubric {
    const { gradingRubric } = extractVariables(code);
    if (!gradingRubric) return {};
    return JSON.parse(gradingRubric.value);
  }

  continueToHome(){
      this.shadowRoot.querySelector("#unauthorizedAccessModal").close();
      navigate('/');
    }

  async loadAssignment(assignmentId: string) {
      this._fireLocalAction('loaded', true);
      setTimeout(() => {
          this._fireLocalAction('loaded', false);

          //TODO This setTimeout is a huge hack until we subscribe to adding the user on a course
          setTimeout(async () => {
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

            const data = await GQLRequest(`query getAssignmentResponses($assignmentId: ID!, $userId: ID!) {
              assignment: Assignment(id: $assignmentId) {
                id
                title
                questionType
                numGradeResponses
              }
              essays: allUserEssays(filter: {
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
            }`, {assignmentId, userId: this.user.id}, this.userToken, this._handleGQLError.bind(this));
            if (!data) {
              return;
            }

            const { assignment, essays } = data;
            const responses = essays ? shuffleArray(essays).slice(0, assignment.numGradeResponses): [];
            this._fireLocalAction('assignment', assignment);
            this._fireLocalAction('responses', responses);
            this._fireLocalAction('loaded', true);
          }, 5000);
      });
  }

  _questionText(text: string): string {
    if (!text) return '';
    return parse(text, null).ast[0].content.replace(/<p>|<p style=".*">|<\/p>|<img.*\/>/g, '');
  }

  _questionPicture(text: string): string {
    if (!text) return '';
    const m = parse(text, null).ast[0].content.match(/<img src="(.*)"/);
    return m ? m[1] : '';
  }


  async _submit(grades: CategoryScore[], responseId: string, userId: string): Promise<boolean> {
    const data = await GQLRequest(`mutation gradeResponse($grades: [QuestionResponseRatingscoresCategoryScore!]!, $responseId: ID!, $userId: ID!) {
      createQuestionResponseRating(
        raterId: $userId,
        questionResponseId: $responseId,
        scores: $grades
      ) {
        id
      }
    }`, {grades, responseId, userId}, this.userToken, this._handleGQLError.bind(this));
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
