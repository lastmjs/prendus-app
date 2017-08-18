import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {User} from '../../typings/user';
import {Assignment} from '../../typings/assignment';
import {AnswerTypes} from '../../typings/answer-types';
import {createUUID} from '../../services/utilities-service';
import {GQLrequest} from '../../services/graphql-service';
import {generateEssay} from '../../services/question-to-code-service';
import {EXAMPLE_GRADING_RUBRIC, DEFAULT_EVALUATION_RUBRIC} from '../../services/constants-service';

class PrendusEssayScaffold extends Polymer.Element {
  loaded: boolean;
  action: SetPropertyAction | SetComponentPropertyAction;
  componentId: string;
  step: number = 0;
  userToken: string | null;
  user: User;

  static get is() { return 'prendus-essay-scaffold' }

  static properties() {
    return {
      assignment: Object
    }
  }

  constructor() {
    super();
    this.componentId = createUUID();
  }

  connectedCallback() {
    super.connectedCallback();
    this._fireLocalAction('loaded', true);
    this._fireLocalAction('rubric', {});
    this.addEventListener('question-rubric-table', (e) => {
      this._fireLocalAction('rubric', e.detail.rubric);
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

  _conceptOptions(concepts: Object[]): {[key: string]: string} {
    return concepts.map(concept => {
      return { id: concept.id, label: concept.title };
    }
  }

  _valid(): boolean {
    const notEmpty = (val) => val != undefined && val.toString().trim().length > 0;
    const categories = Object.keys(this.rubric);
    const options = flatten(categories.map(category => Object.keys(this.rubric[category])));
    const descriptions = flatten(categories.map(category => Object.keys(this.rubric[category]).map(option => this.rubric[category][option].description)));
    const points = flatten(categories.map(category => Object.keys(this.rubric[category]).map(option => this.rubric[category][option].points)));
    return notEmpty(this.resource)
      && this._conceptOptions(this.assignment.concepts).map(concept => concept.id).includes(this.conceptId)
      && notEmpty(this.questionText)
      && categories.length > 0
      && categories.filter(category => Object.keys(this.rubric[category]).length > 1).length === categories.length
      && categories.filter(notEmpty).length === categories.length
      && options.filter(notEmpty).length === options.length
      && descriptions.filter(notEmpty).length === descriptions.length
      && points.filter(num => num != NaN && num > -1).length === points.length;
  }

  _saveQuestion(variables: Object) {
    const mutation = `mutation createQuestion($userId: ID!, $assignmentId: ID, $resource: String!, $conceptId: ID!, $text: String!, $code: String!) {
      createQuestion (
        authorId: $userId,
        assignmentId: $assignmentId,
        resource: $resource,
        conceptId: $conceptId,
        text: $text,
        code: $code,
      ) {
        id
      }
    }`;
    console.log(variables);
    GQLrequest(mutation, variables, this.userToken)
      .then(this._handleSubmit.bind(this))
      .catch(err => { console.error(err) });
  }

  _showNext(step: number): boolean {
    return step < this.$.ironPages.children.length - 1;
  }

  _handleSubmit(data: Object): void {
    if (data.errors) throw new Error(data.errors.map(err => err.message).join("\n"));
    const evt = new CustomEvent('question-created', { bubbles: false composed: true});
    this.dispatchEvent(evt);
    this._fireLocalAction('step', 0);
    this._fireLocalAction('resource', '');
    this._fireLocalAction('questionText', '');
    this._fireLocalAction('rubric', {});
    this._fireLocalAction('conceptId', null);
    this.$.ironPages.querySelector('#concepts').selected = null;
  }

  exampleRubric(): Object[] {
    return EXAMPLE_GRADING_RUBRIC;
  }

  setConceptId(e) {
    if (e.detail.value)
      this._fireLocalAction('conceptId', e.detail.value.id);
  }

  setQuestionText(e) {
    this._fireLocalAction('questionText', e.target.value);
  }

  setResource(e) {
    this._fireLocalAction('resource', e.target.value);
  }

  back(): void {
    this._fireLocalAction('step', this.step - 1);
  }

  next(): void {
    this._fireLocalAction('step', this.step + 1);
  }

  submit(): void {
    if (!this._valid()) {
      console.log('invalid!'); //TODO: jump to step with errors or display error
      return;
    }
    const { text, code } = generateEssay({stem: this.questionText}, this.rubric, DEFAULT_EVALUATION_RUBRIC);
    const variables = {
      userId: this.user.id,
      assignmentId: this.assignment.id,
      resource: this.resource,
      conceptId: this.conceptId,
      text,
      code
    };
    this._saveQuestion(variables);
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    const keys = Object.keys(componentState);
    if (keys.includes('loaded')) this.loaded = componentState.loaded;
    if (keys.includes('step')) this.step = componentState.step;
    if (keys.includes('resource')) this.resource = componentState.resource;
    if (keys.includes('questionText')) this.questionText = componentState.questionText;
    if (keys.includes('conceptId')) this.conceptId = componentState.conceptId;
    if (keys.includes('rubric')) this.rubric = componentState.rubric;
    this.userToken = state.userToken;
    this.user = state.user;
  }

}

function flatten(arr: any[]): any[] {
  return arr.reduce((acc, elem) => {
    return acc.concat(Array.isArray(elem) ? flatten(elem) : elem);
  },[]);
}

window.customElements.define(PrendusEssayScaffold.is, PrendusEssayScaffold)
