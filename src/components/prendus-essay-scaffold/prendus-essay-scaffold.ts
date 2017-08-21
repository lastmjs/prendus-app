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
    this.addEventListener('concept-selected', this._handleConcept.bind(this));
  }

  _fireLocalAction(key: string, value: any) {
    this.action = {
      type: 'SET_COMPONENT_PROPERTY',
      componentId: this.componentId,
      key,
      value
    };
  }

  _handleConcept(e) {
    this._fireLocalAction('concept', e.detail.concept);
  }

  _valid(): boolean {
    const notEmpty = (val) => val != undefined && val.toString().trim().length > 0;
    const categories = Object.keys(this.rubric);
    const options = flatten(categories.map(category => Object.keys(this.rubric[category])));
    const descriptions = flatten(categories.map(category => Object.keys(this.rubric[category]).map(option => this.rubric[category][option].description)));
    const points = flatten(categories.map(category => Object.keys(this.rubric[category]).map(option => this.rubric[category][option].points)));
    return notEmpty(this.resource)
      && this.concept
      && (notEmpty(this.concept.id) || notEmpty(this.concept.title))
      && notEmpty(this.questionText)
      && categories.length > 0
      && categories.filter(category => Object.keys(this.rubric[category]).length > 1).length === categories.length
      && categories.filter(notEmpty).length === categories.length
      && options.filter(notEmpty).length === options.length
      && descriptions.filter(notEmpty).length === descriptions.length
      && points.filter(num => num != NaN && num > -1).length === points.length;
  }

  _showNext(step: number): boolean {
    return step < this.$.ironPages.children.length - 1;
  }

  clear() {
    this._fireLocalAction('step', 0);
    this._fireLocalAction('resource', '');
    this._fireLocalAction('questionText', '');
    this._fireLocalAction('rubric', {});
    this._fireLocalAction('conceptId', null);
  }

  exampleRubric(): Object[] {
    return EXAMPLE_GRADING_RUBRIC;
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
    const question = {
      authorId: this.user.id,
      assignmentId: this.assignment.id,
      resource: this.resource,
      ...this.concept.id && { conceptId: this.concept.id },
      ...!this.concept.id && { concept: this.concept },
      text,
      code
    };
    const evt = new CustomEvent('question-created', {bubbles: false, composed: true, detail: {question}});
    this.dispatchEvent(evt);
    this.clear();
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    const keys = Object.keys(componentState);
    if (keys.includes('loaded')) this.loaded = componentState.loaded;
    if (keys.includes('step')) this.step = componentState.step;
    if (keys.includes('resource')) this.resource = componentState.resource;
    if (keys.includes('questionText')) this.questionText = componentState.questionText;
    if (keys.includes('concept')) this.concept = componentState.concept;
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
