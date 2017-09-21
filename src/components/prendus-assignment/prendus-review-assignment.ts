import {SetPropertyAction, SetComponentPropertyAction, DefaultAction} from '../../typings/actions';
import {User} from '../../typings/user';
import {createUUID, navigate, getCourseIdFromAssignmentId, isUserAuthorizedOnCourse} from '../../node_modules/prendus-shared/services/utilities-service';
import {shuffleArray} from '../../services/utilities-service'; //TODO: Move into prendus-shared when Jordan is back
import {sendStatement} from '../../services/analytics-service';
import {GQLRequest} from '../../node_modules/prendus-shared/services/graphql-service';
import {extractVariables} from '../../services/code-to-question-service';
import {NotificationType, QuestionType, ContextType, VerbType, ObjectType} from '../../services/constants-service';
import {setNotification, getAndSetUser, checkForUserToken} from '../../redux/actions';
import {LTIPassback} from '../../services/lti-service';
import {DEFAULT_EVALUATION_RUBRIC} from '../../services/constants-service';

class PrendusReviewAssignment extends Polymer.Element {
  loaded: boolean;
  action: SetPropertyAction | SetComponentPropertyAction | DefaultAction;
  componentId: string;
  ratings: CategoryScore[];
  rubric: Rubric;
  userToken: string;
  user: User;

  static get is() { return 'prendus-review-assignment' }

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

  _handleGQLError(err: any) {
    this.action = setNotification(err.message, NotificationType.ERROR);
  }

  continueToHome(){
      this.shadowRoot.querySelector("#unauthorizedAccessModal").close();
      navigate('/');
    }

  _handleNextRequest(e: CustomEvent) {
    try {
      validate(this.rubric, this.ratings);
      this._submit(this.question, this.ratings)
      this.shadowRoot.querySelector('#carousel').nextData();
    } catch (err) {
      this.action = setNotification(err.message, NotificationType.ERROR);
    }
  }

  _handleNextQuestion(e: CustomEvent) {
    const { data } = e.detail;
    this._fireLocalAction('question', data);
    if (data && data === this.questions[0])
      sendStatement(this.userToken, this.user.id, this.assignment.id, ContextType.ASSIGNMENT, VerbType.STARTED, ObjectType.REVIEW);
    else
      sendStatement(this.userToken, this.user.id, this.assignment.id, ContextType.ASSIGNMENT, VerbType.REVIEWED, ObjectType.REVIEW);
    if (data) {
      this._fireLocalAction('rubric', null); //to clear rubric dropdown selections
      setTimeout(() => {
        this._fireLocalAction('rubric', this._parseRubric(data.code, 'evaluationRubric'));
      });
    } else {
      LTIPassback(this.userToken, this.user.id, this.assignment.id, ObjectType.REVIEW);
    }
  }

  _handleRatings(e: CustomEvent) {
    this._fireLocalAction('ratings', e.detail.scores);
  }

  _parseRubric(code: string, varName: string): Rubric {
    if (!code) return {};
    const { evaluationRubric, gradingRubric } = extractVariables(code);
    if (varName === 'evaluationRubric' && evaluationRubric)
      return JSON.parse(evaluationRubric.value);
    else if (varName === 'evaluationRubric')
      return DEFAULT_EVALUATION_RUBRIC;
    else if (varName === 'gradingRubric' && gradingRubric)
      return JSON.parse(gradingRubric.value);
    else return {};
  }

  async _submit(question: Question, ratings: CategoryScore[]) {
    const query = `mutation rateQuestion($questionId: ID!, $ratings: [QuestionRatingscoresCategoryScore!]!, $raterId: ID!) {
      createQuestionRating (
        raterId: $raterId
        questionId: $questionId
        scores: $ratings
      ) {
        id
      }
    }`;
    const variables = {
      questionId: question.id,
      ratings,
      raterId: this.user.id
    };
    await GQLRequest(query, variables, this.userToken, this._handleGQLError.bind(this));
  }

  _fireLocalAction(key: string, value: any) {
    this.action = {
      type: 'SET_COMPONENT_PROPERTY',
      componentId: this.componentId,
      key,
      value
    };
  }

  async loadAssignment(assignmentId: string): Assignment {
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


            const data = await GQLRequest(`query getAssignment($assignmentId: ID!, $userId: ID!) {
              Assignment(id: $assignmentId) {
                id
                title
                questionType
                numReviewQuestions
                questions(filter: {
                  author: {
                    id_not: $userId
                  }
                }) {
                  id
                  text
                  code
                  explanation
                  concept {
                    title
                  }
                  resource
                  answerComments {
                    text
                  }
                  _ratingsMeta {
                    count
                  }
                }
              }
            }`, {assignmentId, userId: this.user.id}, this.userToken, this._handleGQLError.bind(this));
            if (!data) {
              return;
            }
            this._fireLocalAction('assignment', data.Assignment);
            this._fireLocalAction('questions', randomWithUnreviewedFirst(data.Assignment.questions, data.Assignment.numReviewQuestions));
            this._fireLocalAction('loaded', true);
          }, 5000);
      });
  }

  isEssayType(questionType: string): boolean {
    return questionType === QuestionType.ESSAY;
  }

  isMultipleChoiceType(questionType: string): boolean {
    return questionType === QuestionType.MULTIPLE_CHOICE;
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
    if (keys.includes('ratings')) this.ratings = componentState.ratings;
    this.userToken = state.userToken;
    this.user = state.user;
  }

}

function randomWithUnreviewedFirst(questions: Question[], num: number): Question[] {
  const unreviewed = questions.filter(question => !question._ratingsMeta.count);
  if (unreviewed.length >= num)
    return shuffleArray(unreviewed).slice(0, num);
  else if (!unreviewed.length)
    return shuffleArray(questions).slice(0, num);
  const reviewed = questions.filter(question => question._ratingsMeta.count);
  return [...shuffleArray(unreviewed), ...shuffleArray(reviewed).slice(0, num-unreviewed.length)];
}

function validate(rubric: Rubric, ratings: CategoryScore[]) {
  if (!ratings) throw new Error('You must rate the question');
  if (ratings.length !== Object.keys(rubric).length) throw new Error('You must rate each category');
  if (ratings.reduce((bitOr, score) => bitOr || !rubric.hasOwnProperty(score.category) || score.score < 0, false))
    throw new Error('You must rate each category');
}

window.customElements.define(PrendusReviewAssignment.is, PrendusReviewAssignment)
