import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {Concept} from '../../typings/concept';
import {createUUID, shuffleArray} from '../../services/utilities-service';
import {AnswerTypes} from '../../typings/answer-types';
import {generateMultipleChoice} from '../../services/question-to-code-service';

class PrendusScaffold extends Polymer.Element {
  componentId: string;
  action: SetPropertyAction | SetComponentPropertyAction;
  loaded: boolean;
  selectedIndex: number = 0;
  concept: Concept = {};
  resource: string = '';
  question: string = '';
  answer: string = '';
  solution: string = '';
  distractors: string[] = [];
  hints: string[] = [];

  static get is() { return 'prendus-scaffold'; }
  static get properties() {
    return {
      assignment: Object
    };
  }

  constructor() {
    super();
    this.componentId = createUUID();
  }

  connectedCallback() {
    super.connectedCallback();
    this._fireLocalAction('loaded', true);
    this.addEventListener('concept-selected', this._handleConcept.bind(this));
    this.addEventListener('distractors-changed', this._handleDistractors.bind(this));
    this.addEventListener('hints-changed', this._handleHints.bind(this));
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

  _handleResource(e) {
    this._fireLocalAction('resource', e.target.value);
  }

  _handleQuestion(e) {
    this._fireLocalAction('question', e.target.value);
  }

  _handleAnswer(e) {
    this._fireLocalAction('answer', e.target.value);
  }

  _handleSolution(e) {
    this._fireLocalAction('solution', e.target.value);
  }

  _handleDistractors(e) {
    this._fireLocalAction('distractors', e.detail.distractors);
  }

  _handleHints(e) {
    this._fireLocalAction('hints', e.detail.hints);
  }

  _answers(answer: string, distractors: string[]): string[] {
    return [answer].concat(distractors);
  }

  _scaffold(concept: Object, resource: string, question: string, solution: string, answer: string, distractors: string[], hints: string[]): QuestionScaffold {
    const answers = this._scaffoldAnswers(answer, distractors, hints);
    return {
      concept,
      resource,
      question,
      explanation: solution
      answers
    }
  }

  _scaffoldAnswers(answer: string, distractors: string[], hints: string[]): QuestionScaffoldAnswer[] {
    const mChoice = (text, comment, correct) => Object.assign({}, {text, comment, correct, type: AnswerTypes.MultipleChoice});
    return [mChoice(answer, hints[0], true)].concat(distractors.map((distractor, i) => mChoice(distractor, hints[i+1], false)));
  }

  _valid(): boolean {
    return true;
  }

  showNext(i: number): boolean {
    return i < this.$.ironPages.children.length - 1;
  }

  back(): void {
    this._fireLocalAction('selectedIndex', this.selectedIndex - 1);
  }

  next(): void {
    this._fireLocalAction('selectedIndex', this.selectedIndex + 1);
  }

  clear(): void {
    this._fireLocalAction('concept', {});
    this._fireLocalAction('resource', '');
    this._fireLocalAction('question', '');
    this._fireLocalAction('answer', '');
    this._fireLocalAction('solution', '');
    this._fireLocalAction('distractors', []);
    this._fireLocalAction('hints', []);
    this._fireLocalAction('selectedIndex', 0);
  }

  submit(): void {
    if (!this._valid()) {
      console.log('Invalid!');
      return;
    }
    const answers = shuffleArray(this._scaffoldAnswers(this.answer, this.distractors, this.hints));
    const { text, code } = generateMultipleChoice({ stem: this.question, answers });
    const question = {
      authorId: this.user.id,
      assignmentId: this.assignment.id,
      text,
      code,
      ...this.concept.id && {conceptId: this.concept.id},
      ...!this.concept.id && {concept: this.concept},
      explanation: this.solution,
      resource: this.resource,
      answerComments: answers.map(answer => answer.comment)
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
    if (keys.includes('selectedIndex')) this.selectedIndex = componentState.selectedIndex;
    if (keys.includes('concept')) this.concept = componentState.concept;
    if (keys.includes('resource')) this.resource = componentState.resource;
    if (keys.includes('question')) this.question = componentState.question;
    if (keys.includes('answer')) this.answer = componentState.answer;
    if (keys.includes('solution')) this.solution = componentState.solution;
    if (keys.includes('distractors')) this.distractors = componentState.distractors;
    if (keys.includes('hints')) this.hints = componentState.hints;
    this.userToken = state.userToken;
    this.user = state.user;
  }
}

window.customElements.define(PrendusScaffold.is, PrendusScaffold);
