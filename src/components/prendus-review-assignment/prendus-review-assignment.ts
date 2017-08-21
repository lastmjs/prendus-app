import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {User} from '../../typings/user';
import {createUUID, shuffleArray} from '../../services/utilities-service';
import {GQLrequest} from '../../services/graphql-service';
import {extractLiteralVariables} from '../../services/code-to-question-service';
import {DEFAULT_EVALUATION_RUBRIC} from '../../services/constants-service';

class PrendusReviewAssignment extends Polymer.Element {
  loaded: boolean;
  action: SetPropertyAction | SetComponentPropertyAction;
  componentId: string;
  userToken: string | null;
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
    this._fireLocalAction('loaded', true);
    this.addEventListener('rubric-dropdowns', this._handleRatings.bind(this));
    this.addEventListener('carousel-next', this._handleNextRequest.bind(this));
    this.addEventListener('carousel-data', this._handleNextQuestion.bind(this));
  }

  _handleNextRequest(e) {
    if (this._valid(this.ratings, this.rubric) && this._submit(this.question, this.ratings))
      this.$.carousel.nextData();
    else
      console.log('Error!');
  }

  _handleNextQuestion(e) {
    const { data } = e.detail;
    this._fireLocalAction('question', data);
    this._fireLocalAction('rubric', null); //to clear rubric dropdown selections
    setTimeout(() => {
      if (data)
        this._fireLocalAction('rubric', this._parseRubric(data.code));
    });
  }

  _handleRatings(e) {
    this._fireLocalAction('ratings', e.detail.scores);
  }

  _parseRubric(code: string): Object {
    const { evaluationRubric } = extractLiteralVariables(code);
    return JSON.parse(evaluationRubric);
  }

  _valid(ratings: Object[], rubric: Object): boolean {
    console.log(ratings);
    return ratings
      && ratings.length === Object.keys(rubric).length
      && ratings.reduce((bitAnd, score) => {
        return bitAnd && rubric.hasOwnProperty(score.category) && score.score > -1
      }, true);
  }

  _handleSubmit(data: Object) {
    if (data.errors) throw new Error("Error saving question rating");
    return true;
  }

  _handleError(err) {
    console.error(err);
    return false;
  }

  _submit(question: Object, ratings: Object[]) {
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
    return GQLrequest(query, variables, this.userToken)
      .then(this._handleSubmit.bind(this))
      .catch(this._handleError);
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
    const data = await GQLrequest(`query getAssignment($assignmentId: ID!) {
      Assignment(id: $assignmentId) {
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
    this._fireLocalAction('assignment', data.Assignment);
    this._fireLocalAction('questions', shuffleArray(data.Assignment.questions).slice(0, 3));
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

window.customElements.define(PrendusReviewAssignment.is, PrendusReviewAssignment)
