import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {Concept} from '../../typings/concept';
import {createUUID, shuffleArray} from '../../services/utilities-service';
import {AnswerTypes} from '../../typings/answer-types';
import {NotificationType} from '../../services/constants-service';
import {setNotification} from '../../redux/actions';
import {generateMultipleChoice} from '../../services/question-to-code-service';

class PrendusMultipleChoiceScaffold extends Polymer.Element {
  componentId: string;
  action: SetPropertyAction | SetComponentPropertyAction;
  loaded: boolean;
  selectedIndex: number = 0;
  concept: Concept = {};
  resource: string = '';
  questionText: string = '';
  answer: string = '';
  solution: string = '';
  distractors: string[] = [];
  hints: string[] = [];

  static get is() { return 'prendus-multiple-choice-scaffold'; }
  static get properties() {
    return {
      assignment: Object,
      question: {
        type: Number,
        observer: '_initScaffold'
      }
    };
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

  _handleConcept(e: CustomEvent) {
    this._fireLocalAction('concept', e.detail.concept);
  }

  _handleResource(e: Event) {
    this._fireLocalAction('resource', e.target.value);
  }

  _handleQuestion(e: Event) {
    this._fireLocalAction('questionText', e.target.value);
  }

  _handleAnswer(e: Event) {
    this._fireLocalAction('answer', e.target.value);
  }

  _handleSolution(e: Event) {
    this._fireLocalAction('solution', e.target.value);
  }

  _handleDistractors(e: CustomEvent) {
    this._fireLocalAction('distractors', e.detail.distractors);
  }

  _handleHints(e: CustomEvent) {
    this._fireLocalAction('hints', e.detail.comments);
  }

  _initScaffold(question: number) {
    this._fireLocalAction('concept', null)
    this._fireLocalAction('resource', '');
    this._fireLocalAction('questionText', '');
    this._fireLocalAction('answer', '');
    this._fireLocalAction('solution', '');
    this._fireLocalAction('distractors', Array(3));
    this._fireLocalAction('hints', ['Correct', 'Incorrect', 'Incorrect', 'Incorrect']);
    this._fireLocalAction('selectedIndex', 0);
  }

  _scaffold(concept: Concept, resource: string, questionText: string, solution: string, answer: string, distractors: string[], hints: string[]): QuestionScaffold {
    const answers = this._scaffoldAnswers(answer, distractors, hints);
    return {
      concept,
      resource,
      question: questionText,
      explanation: solution
      answers
    }
  }

  _scaffoldAnswers(answer: string, distractors: string[], hints: string[]): QuestionScaffoldAnswer[] {
    const mChoice = (text, comment, correct) => Object.assign({}, {text, comment, correct, type: AnswerTypes.MultipleChoice});
    return [mChoice(answer, hints[0], true), ...distractors.map((distractor, i) => mChoice(distractor, hints[i+1], false))];
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

  submit(): void {
    try {
      validate(this.concept, this.resource, this.questionText, this.answer, this.distractors, this.hints);
    } catch (e) {
      this.action = setNotification(e.message, NotificationType.ERROR);
      return;
    }
    const answers = shuffleArray(this._scaffoldAnswers(this.answer, this.distractors, this.hints));
    const { text, code } = generateMultipleChoice({ stem: this.questionText, answers });
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
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    const keys = Object.keys(componentState);
    if (keys.includes('loaded')) this.loaded = componentState.loaded;
    if (keys.includes('selectedIndex')) this.selectedIndex = componentState.selectedIndex;
    if (keys.includes('concept')) this.concept = componentState.concept;
    if (keys.includes('resource')) this.resource = componentState.resource;
    if (keys.includes('questionText')) this.questionText = componentState.questionText;
    if (keys.includes('answer')) this.answer = componentState.answer;
    if (keys.includes('solution')) this.solution = componentState.solution;
    if (keys.includes('distractors')) this.distractors = componentState.distractors;
    if (keys.includes('hints')) this.hints = componentState.hints;
    this.userToken = state.userToken;
    this.user = state.user;
  }
}

function validate(concept: Concept, resource: string, questionText: string, answer: string, distractors: string[], hints: string[]) {
    const empty = str => str == undefined || str.toString().trim() === '';
    const someEmpty = (bitOr, str) => bitOr || empty(str);
    if (empty(concept.id) && empty(concept.title)) throw new Error('Concept must be entered or selected');
    if (empty(resource)) throw new Error('Resource must not be empty');
    if (empty(questionText)) throw new Error('Question text must not be empty');
    if (empty(answer)) throw new Error('You must provide a correct answer');
    if (distractors.length !== 3 || distractors.reduce(someEmpty, false))
      throw new Error('Incorrect answers must not be empty');
    if (hints.length !== 4 || hints.reduce(someEmpty, false))
      throw new Error('Answer comments must not be empty');
}

window.customElements.define(PrendusMultipleChoiceScaffold.is, PrendusMultipleChoiceScaffold);
