import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {Concept} from '../../typings/concept';
import {createUUID, shuffleArray, asyncMap} from '../../node_modules/prendus-shared/services/utilities-service';
import {AnswerTypes} from '../../typings/answer-types';
import {NotificationType} from '../../services/constants-service';
import {GQLSaveFile} from '../../services/graphql-file-service';
import {setNotification} from '../../redux/actions';
import {generateMultipleChoice} from '../../services/question-to-code-service';

class PrendusMultipleChoiceScaffold extends Polymer.Element {
  componentId: string;
  action: SetPropertyAction | SetComponentPropertyAction;
  loaded: boolean;
  selectedIndex: number;
  concept: Concept;
  resource: string;
  questionText: string;
  answer: string;
  solution: string;
  distractors: string[];
  hints: string[];
  questionPicture: File;
  answerPicture: File;
  questionPictureText: string;
  distractorPictures: File[];

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

  _validPicture(e: CustomEvent): boolean {
    if (!e.target || !e.target.files || !e.target.files[0])
      return false;
    const file = e.target.files[0];
    const ext = file.name.substr(file.name.lastIndexOf('.') + 1);
    if (ext !== 'png' && ext !== 'gif' && ext !== 'jpeg' && ext !== 'jpg')
      return false;
    return true;
  }

  _handleQuestionPicture(e: Event) {
    if (!this._validPicture(e)) return;
    const file = e.target.files[0];
    this._fireLocalAction('questionPicture', file);
    this._fireLocalAction('questionPictureText', file.name);
  }

  _handleAnswerPicture(e: Event) {
    if (!this._validPicture(e)) return;
    const file = e.target.files[0];
    this._fireLocalAction('answerPicture', file);
  }

  _triggerQuestionPicture(e: Event) {
    this.shadowRoot.querySelector('#question-picture').click();
  }

  _triggerAnswerPicture(e: Event) {
    this.shadowRoot.querySelector('#answer-picture').click();
  }

  _handleDistractorPictures(e: CustomEvent) {
    this._fireLocalAction('distractorPictures', e.detail.pictures);
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
    this._fireLocalAction('questionPicture', null)
    this._fireLocalAction('answerPicture', null)
    this._fireLocalAction('distractorPictures', [])
    this._fireLocalAction('selectedIndex', 0);
  }

  _scaffold(concept: Concept, resource: string, questionText: string, solution: string, answer: string, distractors: string[], hints: string[], questionPicture: File, answerPicture: File, distractorPictures: File[]): QuestionScaffold {
    const answers = this._scaffoldAnswersWithPictures(answer, distractors, hints, answerPicture, distractorPictures);
    return {
      concept,
      resource,
      question: questionText,
      questionPicture,
      explanation: solution,
      answers
    }
  }

  _scaffoldAnswersWithPictures(answer: string, distractors: string[], hints: string[], answerPicture: File|FileResponse, distractorPictures: File[]|FileResponse[]): QuestionScaffoldAnswer[] {
    const mChoice = (text, comment, correct, picture) => {
      return {text, comment, correct, picture, type: AnswerTypes.MultipleChoice}
    };
    const distractorChoice = (distractor, i) => {
      return mChoice(
        distractor,
        hints ? hints[i+1] : '',
        false,
        distractorPictures ? distractorPictures[i] : null
    };
    return [mChoice(answer, hints ? hints[0] : '', true, answerPicture), ...(distractors || []).map(distractorChoice)];
  }

  _textAndPicture(text: string, picture: File): {text: string, picture: File} {
    return { text, picture }
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

  async submit(): void {
    try {
      validate(this.concept, this.resource, this.questionText, this.answer, this.distractors, this.hints, this.answerPicture, this.distractorPictures);
    } catch (e) {
      this.action = setNotification(e.message, NotificationType.ERROR);
      return;
    }
    const questionPicture = this.questionPicture ? (await GQLSaveFile(this.questionPicture)) : null;
    const answerPicture = this.answerPicture ? (await GQLSaveFile(this.answerPicture)) : null;
    const distractorPictures = this.distractorPictures.length ? (await asyncMap(this.distractorPictures, GQLSaveFile)) : [];
    const imageIds = [questionPicture, answerPicture, ...distractorPictures].reduce((ids, picture) => picture ? [...ids, picture.id] : ids, []);
    const answers = shuffleArray(this._scaffoldAnswersWithPictures(this.answer, this.distractors, this.hints, answerPicture, distractorPictures));
    const { text, code } = generateMultipleChoice({ stem: this.questionText, answers, questionPictureUrl: (questionPicture ? questionPicture.url.replace(/files/, 'images') + '/x300' : '') });
    const question = {
      authorId: this.user.id,
      assignmentId: this.assignment.id,
      text,
      code,
      ...this.concept.id && {conceptId: this.concept.id},
      ...!this.concept.id && {concept: this.concept},
      explanation: this.solution,
      resource: this.resource,
      answerComments: answers.map(answer => Object.assign({}, {text: answer.comment})),
      imageIds
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
    if (keys.includes('questionPicture')) this.questionPicture = componentState.questionPicture;
    if (keys.includes('answerPicture')) this.answerPicture = componentState.answerPicture;
    if (keys.includes('questionPictureText')) this.questionPictureText = componentState.questionPictureText;
    if (keys.includes('distractorPictures')) this.distractorPictures = componentState.distractorPictures;
    this.userToken = state.userToken;
    this.user = state.user;
  }
}

function validate(concept: Concept, resource: string, questionText: string, answer: string, distractors: string[], hints: string[], answerPicture: File, distractorPictures: File[]) {
    const empty = str => str == undefined || str.toString().trim() === '';
    const someEmpty = (bitOr, str) => bitOr || empty(str);
    const someEmptyAndNoPicture = (bitOr, str, i) => bitOr || (empty(str) && !distractorPictures[i]);
    if (empty(concept.id) && empty(concept.title)) throw new Error('Concept must be entered or selected');
    if (empty(resource)) throw new Error('Resource must not be empty');
    if (empty(questionText)) throw new Error('Question text must not be empty');
    if (empty(answer) && !answerPicture) throw new Error('You must provide a correct answer');
    if (distractors.length !== 3 || distractors.reduce(someEmptyAndNoPicture, false))
      throw new Error('Incorrect answers must not be empty');
    if (hints.length !== 4 || hints.reduce(someEmpty, false))
      throw new Error('Answer comments must not be empty');
}

window.customElements.define(PrendusMultipleChoiceScaffold.is, PrendusMultipleChoiceScaffold);
