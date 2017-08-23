import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {User} from '../../typings/user';
import {createUUID, shuffleArray} from '../../services/utilities-service';
import {GQLrequest} from '../../services/graphql-service';
import {extractVariables} from '../../services/code-to-question-service';
import {DEFAULT_EVALUATION_RUBRIC} from '../../services/constants-service';

class PrendusReviewAssignment extends Polymer.Element {
  loaded: boolean;
  action: SetPropertyAction | SetComponentPropertyAction;
  componentId: string;
  ratings: CategoryScore[] = [];
  rubric: Rubric = {};
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
  }

  _handleNextRequest(e: CustomEvent) {
    try {
      validate(this.rubric, this.ratings);
      this._submit(this.question, this.ratings)
      this.$.carousel.nextData();
    } catch (err) {
      this._fireLocalAction('error', err);
      return;
    }
  }

  _handleNextQuestion(e: CustomEvent) {
    const { data } = e.detail;
    this._fireLocalAction('question', data);
    this._fireLocalAction('rubric', null); //to clear rubric dropdown selections
    setTimeout(() => {
      if (data)
        this._fireLocalAction('rubric', this._parseRubric(data.code));
    });
  }

  _handleRatings(e: CustomEvent) {
    this._fireLocalAction('ratings', e.detail.scores);
  }

  _parseRubric(code: string): Rubric {
    const { evaluationRubric } = extractVariables(code);
    if (evaluationRubric)
      return JSON.parse(evaluationRubric.value);
    return DEFAULT_EVALUATION_RUBRIC;
  }

  _handleSubmit(data: object) {
    if (data.errors) throw new Error("Error saving question rating");
  }

  _submit(question: Question, ratings: CategoryScore[]) {
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
    const data = await GQLrequest(`query getAssignment($assignmentId: ID!, $userId: ID!) {
      Assignment(id: $assignmentId) {
        id
        title
        questionType
        review
        questions(filter: {
          author: {
            id: $userId
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
        }
      }
    }`, {assignmentId, userId: this.user.id}, this.userToken);
    this._fireLocalAction('assignment', data.Assignment);
    this._fireLocalAction('questions', shuffleArray(data.Assignment.questions).slice(0, data.Assignment.review));
  }

  isEssayType(questionType: string): boolean {
    return questionType === 'ESSAY';
  }

  isMultipleChoiceType(questionType: string): boolean {
    return questionType === 'MULTIPLE_CHOICE';
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
    if (keys.includes('error')) this.error = componentState.error;
    this.userToken = state.userToken;
    this.user = state.user;
  }

}

function validate(rubric: Rubric, ratings: CategoryScore[]) {
  if (!ratings) throw new Error('You must rate the question');
  if (ratings.length !== Object.keys(rubric).length) throw new Error('You must rate each category');
  if (ratings.reduce((bitOr, score) => bitOr || !rubric.hasOwnProperty(score.category) || score.score < 0, false))
    throw new Error('You must rate each category');
}

window.customElements.define(PrendusReviewAssignment.is, PrendusReviewAssignment)