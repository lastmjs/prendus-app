import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {User} from '../../typings/user';
import {createUUID, shuffleArray} from '../../services/utilities-service';
import {GQLrequest} from '../../services/graphql-service';
import {parse} from '../../node_modules/assessml/assessml';

class PrendusGradeAssignment extends Polymer.Element {
  loaded: boolean;
  action: SetPropertyAction | SetComponentPropertyAction;
  progress: number = 0;
  componentId: string;
  userToken: string | null;
  user: User;

  static get is() { return 'prendus-grade-assignment' }

  static get properties() {
    return {
      assignmentId: {
        type: String,
        observer: '_assignmentIdChanged'
      }
    }
  }

  constructor() {
    super();
    this.componentId = createUUID();
  }

  _fireLocalAction(key: string, value: any) {
    this.action = {
      type: 'SET_COMPONENT_PROPERTY',
      componentId: this.componentId,
      key,
      value
    };
  }

  connectedCallback() {
    super.connectedCallback();
    this._fireLocalAction('loaded', true);
  }

  _assignmentIdChanged(id: string): void {
    this.loadAssignment(id);
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
          gradingRubric {
            categories {
              name
              options {
                name
                description
                points
              }
            }
          }
        }
      }
    }`, {assignmentId}, this.userToken);
    const { assignment } = data;
    const questions = shuffleArray(assignment.questions).slice(0, 3);//assignment.reviewQuota);
    this._fireLocalAction('assignment', assignment);
    this._fireLocalAction('quota', questions.length);
    this._fireLocalAction('progress', 0);
    this._fireLocalAction('questions', questions);
    this._fireLocalAction('question', questions[0]);
    this._fireLocalAction('rubricCategories', questions[0].gradingRubric.categories);
  }
  _questionText(text: string): string {
    return parse(text, null).ast[0].content.replace('<p>', '').replace('</p><p>', ''));
  }

  _plusOne(num: number): number {
    return num + 1;
  }

  _valid() {
    return this.grades != undefined
      && this.question.gradingRubric.categories.reduce((bitAnd, category) => {
        return bitAnd && this.grades.hasOwnProperty(category.name) && this.grades[category.name] > -1
      }, true);
  }

  _handleSubmit(data: Object) {
    if (data.errors) throw new Error("Error saving question rating");
    const progress = this.progress + 1;
    if (progress == this.questions.length)
      this._fireLocalAction('done', true);
    else {
      this._fireLocalAction('progress', progress);
      this._fireLocalAction('question', this.questions[progress]);
      //hack for now to clear rubric dropdown selections
      this._fireLocalAction('rubricCategories', null);
      setTimeout(() => { this._fireLocalAction('rubricCategories', this.assignment.evaluationRubric.categories) });
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
    /*GQLrequest(query, variables, this.userToken)
      .then(this._handleSubmit.bind(this))
      .catch(err => { console.error(err) });*/
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    const keys = Object.keys(componentState);
    if (keys.includes('loaded')) this.loaded = componentState.loaded;
    if (keys.includes('progress')) this.progress = componentState.progress;
    if (keys.includes('quota')) this.quota = componentState.quota;
    if (keys.includes('assignment')) this.assignment = componentState.assignment;
    if (keys.includes('questions')) this.questions = componentState.questions;
    if (keys.includes('question')) this.question = componentState.question;
    if (keys.includes('rubricCategories')) this.rubricCategories = componentState.rubricCategories;
    if (keys.includes('done')) this.done = componentState.done;
    this.userToken = state.userToken;
    this.user = state.user;
  }

}

window.customElements.define(PrendusGradeAssignment.is, PrendusGradeAssignment)
