import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {User} from '../../typings/user';
import {createUUID, shuffleArray} from '../../services/utilities-service';
import {GQLrequest} from '../../services/graphql-service';
import {parse} from '../../node_modules/assessml/assessml';

class PrendusEssayReview extends Polymer.Element {
  loaded: boolean;
  action: SetPropertyAction | SetComponentPropertyAction;
  componentId: string;
  progress: number = 0;
  quota: number = 3;
  userToken: string | null;
  user: User;

  static get is() { return 'prendus-essay-review' }

  static get properties() {
    return {
      assignment: {
        type: Object,
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
  }

  _fireLocalAction(key: string, value: any) {
    this.action = {
      type: 'SET_COMPONENT_PROPERTY',
      componentId: this.componentId,
      key,
      value
    };
  }

  _initQuestions(assignment) {
    const questions = shuffleArray(assignment.questions).slice(0, 3);//assignment.reviewQuota);
    this._fireLocalAction('quota', questions.length);
    this._fireLocalAction('questions', questions);
    this._fireLocalAction('question', questions[0]);
    this._fireLocalAction('rubricCategories', assignment.evaluationRubric.categories);
  }

  _questionText(text: string): string {
    return parse(text, null).ast[0].content.replace('<p>', '').replace('</p><p>', ''));
  }

  _plusOne(num: number): number {
    return num + 1;
  }

  _valid() {
    return this.ratings != undefined
      && this.assignment.evaluationRubric.categories.reduce((bitAnd, category) => {
        console.log(bitAnd, this.ratings[category.name]);
        return bitAnd && this.ratings.hasOwnProperty(category.name) && this.ratings[category.name] > -1
      }, true);
  }

  _handleSubmit(data: Object) {
    if (data.errors) throw new Error("Error saving question rating");
    const progress = this.progress + 1;
    this._fireLocalAction('progress', progress);
    if (progress == this.questions.length)
      console.log('Done!');
    else {
      this._fireLocalAction('question', this.questions[progress]);
      //hack for now to clear rubric dropdown selections
      this._fireLocalAction('rubricCategories', null);
      this._fireLocalAction('rubricCategories', this.assignment.evaluationRubric.categories);
    }
  }

  _submit() {
    if (!this._valid()) {
      console.log('invalid!'); //TODO: display error
      return;
    }
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
      questionId: this.question.id,
      ratingJson: JSON.stringify(this.ratings),
      raterId: this.user.id
    };
    console.log(variables);
    GQLrequest(query, variables, this.userToken)
      .then(this._handleSubmit.bind(this))
      .catch(err => { console.error(err) });
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    const keys = Object.keys(componentState);
    if (keys.includes('loaded')) this.loaded = componentState.loaded;
    if (keys.includes('progress')) this.progress = componentState.progress;
    if (keys.includes('quota')) this.quota = componentState.quota;
    if (keys.includes('questions')) this.questions = componentState.questions;
    if (keys.includes('question')) this.question = componentState.question;
    if (keys.includes('rubricCategories')) this.rubricCategories = componentState.rubricCategories;
    this.userToken = state.userToken;
    this.user = state.user;
  }

}

window.customElements.define(PrendusEssayReview.is, PrendusEssayReview)
