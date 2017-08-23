import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {User} from '../../typings/user';
import {Assignment} from '../../typings/assignment';
import {Concept} from '../../typings/concept';
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
  concept: Concept = {};
  questionText: string = '';
  resource: string = '';
  rubric: Rubric = {};
  userToken: string | null;
  user: User;

  static get is() { return 'prendus-essay-scaffold' }

  static get properties() {
    return {
      assignment: Object,
      question: {
        type: Number,
        observer: '_initScaffold'
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

  _showNext(step: number): boolean {
    return step < this.$.ironPages.children.length - 1;
  }

  _initScaffold(question) {
    this._fireLocalAction('step', 0);
    this._fireLocalAction('resource', '');
    this._fireLocalAction('questionText', '');
    this._fireLocalAction('rubric', {});
    this._fireLocalAction('concept', null);
  }

  _handleConcept(e: CustomEvent) {
    this._fireLocalAction('error', null);
    this._fireLocalAction('concept', e.detail.concept);
  }

  _handleRubric(e: CustomEvent) {
    this._fireLocalAction('error', null);
    this._fireLocalAction('rubric', e.detail.rubric);
  }

  exampleRubric(): Object[] {
    return EXAMPLE_GRADING_RUBRIC;
  }

  setQuestionText(e: Event) {
    this._fireLocalAction('error', null);
    this._fireLocalAction('questionText', e.target.value);
  }

  setResource(e: Event) {
    this._fireLocalAction('error', null);
    this._fireLocalAction('resource', e.target.value);
  }

  back(): void {
    this._fireLocalAction('step', this.step - 1);
  }

  next(): void {
    this._fireLocalAction('step', this.step + 1);
  }

  submit(): void {
    try {
      validate(this.concept, this.resource, this.questionText, this.rubric);
    } catch (e) {
      this._fireLocalAction('error', e);
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
    const evt = new CustomEvent('question-created', {composed: true, detail: {question}});
    this.dispatchEvent(evt);
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
    if (keys.includes('error')) this.error = componentState.error;
    this.userToken = state.userToken;
    this.user = state.user;
  }

}

function validate(concept: Concept, resource: string, questionText: string, rubric: Rubric) {
  const empty = (val) => val == undefined || val.toString().trim().length === 0;
  const categories = Object.keys(rubric);
  const options = flatten(categories.map(category => Object.keys(rubric[category])));
  const descriptions = flatten(categories.map(category => Object.keys(rubric[category]).map(option => rubric[category][option].description)));
  const points = flatten(categories.map(category => Object.keys(rubric[category]).map(option => rubric[category][option].points)));
  if (empty(resource)) throw new Error('Resource must not be empty');
  if (empty(concept.id) && empty(concept.title)) throw new Error('Concept must be selected or entered');
  if (empty(questionText)) throw new Error('Question must not be empty');
  if (categories.length === 0) throw new Error('Rubric must have at least one category');
  if (categories.filter(category => Object.keys(rubric[category]).length < 2).length)
    throw new Error('All rubric categories must have at least two scales');
  if (categories.filter(empty).length)
    throw new Error('All rubric categories must have non-empty names');
  if (options.filter(empty).length)
    throw new Error('All rubric scales must have non-empty names');
  if (descriptions.filter(empty).length)
    throw new Error('All rubric descriptions must be non-empty');
  if (points.filter(num => num != NaN && num < 0).length)
    throw new Error('All rubric scores must be non-negative');
}

function flatten(arr: any[]): any[] {
  return arr.reduce((acc, elem) => {
    return acc.concat(Array.isArray(elem) ? flatten(elem) : elem);
  },[]);
}

window.customElements.define(PrendusEssayScaffold.is, PrendusEssayScaffold)
