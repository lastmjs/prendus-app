import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {User} from '../../typings/user';
import {rubric} from '../../typings/evaluation-rubric';
import {createUUID, shuffleArray} from '../../services/utilities-service';
import {GQLrequest} from '../../services/graphql-service';
import {parse} from '../../node_modules/assessml/assessml';

class PrendusEssayReview extends Polymer.Element {
  loaded: boolean;
  action: SetPropertyAction | SetComponentPropertyAction;
  componentId: string;
  userToken: string | null;
  user: User;

  static get is() { return 'prendus-essay-review' }

  static get properties() {
    return {
      questions: {
        type: Array,
        observer: '_initQuestions'
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
    this.addEventListener('rubric-dropdowns', (e) => {
      this._fireLocalAction('ratings', e.detail.scores);
    });
    this.addEventListener('question-carousel', (e) => {
      const { question } = e.detail;
      if (this._valid(this.ratings) && this._submit(this.question, this.ratings)) {
        this._storeQuestion(question);
        this.$.carousel.nextQuestion();
      } else if (question === this.questions[0])
        this._storeQuestion(question);
    });
  }

  _fireLocalAction(key: string, value: any) {
    this.action = {
      type: 'SET_COMPONENT_PROPERTY',
      componentId: this.componentId,
      key,
      value
    };
  }

  _initQuestions(questions: Object[]) {
    this._fireLocalAction('questions', questions);
  }

  _storeQuestion(question: Object) {
    this._fireLocalAction('question', question);
    this._fireLocalAction('rubric', this._parseRubric(question.code, 'evaluationRubric'));
  }

  _parseRubric(code: string, variable: string): Object {
    return rubric;
  }

  _questionText(text: string): string {
    return parse(text, null).ast[0].content.replace('<p>', '').replace('</p><p>', ''));
  }

  _valid(ratings: Object): boolean {
    return ratings != undefined
      && Object.keys(this.rubric).reduce((bitAnd, category) => {
        return bitAnd && ratings.hasOwnProperty(category) && ratings[category] > -1
      }, true);
  }

  _handleSubmit(data: Object) {
    if (data.errors) throw new Error("Error saving question rating");
    //hack for now to clear rubric dropdown selections
    this._fireLocalAction('rubric', null);
    return true;
  }

  _handleError(err) {
    console.error(err);
    return false;
  }

  _submit(question: Object, ratings: Object) {
    const query = `mutation rateQuestion($questionId: ID!, $ratingJson: Json!, $raterId: ID!) {
      createQuestionRating (
        raterId: $raterId
        questionId: $questionId
        ratingJson: $ratingJson
      ) {
        id
      }
    }`;
    const variables = {
      questionId: question.id,
      ratingJson: JSON.stringify(ratings),
      raterId: this.user.id
    };
    console.log(variables);
    return GQLrequest(query, variables, this.userToken)
      .then(this._handleSubmit.bind(this))
      .catch(this._handleError);
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    const keys = Object.keys(componentState);
    if (keys.includes('loaded')) this.loaded = componentState.loaded;
    if (keys.includes('question')) this.question = componentState.question;
    if (keys.includes('questions')) this.questions = componentState.questions;
    if (keys.includes('rubric')) this.rubric = componentState.rubric;
    this.userToken = state.userToken;
    this.user = state.user;
  }

}

window.customElements.define(PrendusEssayReview.is, PrendusEssayReview)
