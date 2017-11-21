import {createUUID, asyncMap} from '../../node_modules/prendus-shared/services/utilities-service';
import {shuffleArray} from '../../services/utilities-service'; //TODO: Move into prendus-shared when Jordan is back
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
  questionStem: string;
  answer: string;
  solution: string;
  distractors: string[];
  hints: string[];

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
    this._fireLocalAction('nextDisabled', !this.stepCompleted(1));
  }

  _handleResource(e: Event) {
    this._fireLocalAction('resource', e.target.value);
    this._fireLocalAction('nextDisabled', !this.stepCompleted(2));
  }

  _handleQuestion(e: Event) {
    this._fireLocalAction('questionStem', {...this.questionStem, text: e.target.value});
    this._fireLocalAction('nextDisabled', !this.stepCompleted(3));
  }

  _handleAnswer(e: Event) {
    this._fireLocalAction('answer', {...this.answer, text: e.target.value});
    this._fireLocalAction('nextDisabled', !this.stepCompleted(3));
  }

  _handleSolution(e: Event) {
    this._fireLocalAction('solution', e.target.value);
  }

  _handleDistractors(e: CustomEvent) {
    this._fireLocalAction('distractors', e.detail.distractors);
    this._fireLocalAction('nextDisabled', !this.stepCompleted(4));
  }

  _validPicture(e: CustomEvent): boolean {
    if (!e.target || !e.target.files || !e.target.files[0])
      return false;
    const file = e.target.files[0];
    const ext = file.name.substr(file.name.lastIndexOf('.') + 1).toLowerCase();
    if (ext !== 'png' && ext !== 'gif' && ext !== 'jpeg' && ext !== 'jpg') {
      this.action = setNotification('The file does not have an image file extension.', NotificationType.ERROR);
      return;
    }
    return true;
  }

  _handleQuestionPicture(e: Event) {
    if (!this._validPicture(e)) return;
    const file = e.target.files[0];
    this._fireLocalAction('questionStem', {...this.questionStem, picture: file});
  }

  _handleAnswerPicture(e: Event) {
    if (!this._validPicture(e)) return;
    const file = e.target.files[0];
    this._fireLocalAction('answer', {...this.answer, picture: file});
    this._fireLocalAction('nextDisabled', !this.stepCompleted(3));
  }

  _triggerQuestionPicture(e: Event) {
    this.shadowRoot.querySelector('#question-picture').click();
  }

  _triggerAnswerPicture(e: Event) {
    this.shadowRoot.querySelector('#answer-picture').click();
  }

  _handleHints(e: CustomEvent) {
    this._fireLocalAction('hints', e.detail.comments);
    this._fireLocalAction('nextDisabled', !this.stepCompleted(5));
  }

  stepCompleted(step: number): boolean {
    switch(step) {
      case 1: return this.concept && (this.concept.id || this.concept.title);
      case 2: return this.resource;
      case 3: return this.questionStem && this.questionStem.text && (this.answer.text || this.answer.picture);
      case 4: return !this.distractors.some(distractor => !distractor || (!distractor.text && !distractor.picture));
      case 5: return !this.hints.some(hint => !hint || !hint.length);
      default: return true;
    }
  }

  _initScaffold(question: number) {
    this._fireLocalAction('concept', null)
    this._fireLocalAction('resource', '');
    this._fireLocalAction('questionStem', {text: '', picture: null});
    this._fireLocalAction('answer', {text: '', picture: null});
    this._fireLocalAction('solution', '');
    this._fireLocalAction('distractors', Array(3).fill({text: '', picture: null}));
    this._fireLocalAction('hints', ['Correct', 'Incorrect', 'Incorrect', 'Incorrect']);
    this._fireLocalAction('selectedIndex', 0);
    //Can't be achieved through data binding. So we need this mutation
    this.shadowRoot.getElementById('question-picture').value = '';
    this.shadowRoot.getElementById('answer-picture').value = '';
  }

  _scaffold(concept: Concept, resource: string, questionStem: string, solution: string, answer: string, distractors: string[], hints: string[]): QuestionScaffold {
    const answers = this._scaffoldAnswersWithPictures(answer, distractors, hints);
    return {
      concept,
      resource,
      question: questionStem,
      explanation: solution,
      answers
    }
  }

  _scaffoldAnswersWithPictures(answer: string, distractors: string[], hints: string[]): QuestionScaffoldAnswer[] {
    const mChoice = (choice, comment, correct) => {
      const text = choice ? choice.text : '';
      const picture = choice ? choice.picture : null;
      return {text, comment, correct, picture, type: AnswerTypes.MultipleChoice}
    };
    return [mChoice(answer, hints ? hints[0] : '', true), ...(distractors || []).map((distractor, i) => mChoice(distractor, (hints ? hints[i+1]: ''), false))];
  }

  showNext(i: number): boolean {
    return i < this.$.ironPages.children.length - 1;
  }

  back(): void {
    this._fireLocalAction('selectedIndex', this.selectedIndex - 1);
    this._fireLocalAction('nextDisabled', false);
  }

  next(): void {
    this._fireLocalAction('selectedIndex', this.selectedIndex + 1);
    this._fireLocalAction('nextDisabled', !this.stepCompleted(this.selectedIndex));
  }

  async submit(): void {
    try {
      validate(this.concept, this.resource, this.questionStem, this.answer, this.distractors, this.hints);
    } catch (e) {
      this.action = setNotification(e.message, NotificationType.ERROR);
      return;
    }
    const questionPicture = this.questionStem.picture ? (await GQLSaveFile(this.questionStem.picture)) : null;
    const answerPicture = this.answer.picture ? (await GQLSaveFile(this.answer.picture)) : null;
    const distractorPictures = await asyncMap(this.distractors.map(distractor => distractor.picture), GQLSaveFile);
    const imageIds = [questionPicture, answerPicture, ...distractorPictures].reduce((ids, picture) => picture ? [...ids, picture.id] : ids, []);
    const answers = shuffleArray(this._scaffoldAnswersWithPictures(
      {...this.answer, picture: answerPicture},
      this.distractors.map((distractor, i) => { return {...distractor, picture: distractorPictures[i]} }),
      this.hints
    ));
    const { text, code } = generateMultipleChoice({ stem: {...this.questionStem, picture: questionPicture}, answers });
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
    if (keys.includes('questionStem')) this.questionStem = componentState.questionStem;
    if (keys.includes('answer')) this.answer = componentState.answer;
    if (keys.includes('solution')) this.solution = componentState.solution;
    if (keys.includes('distractors')) this.distractors = componentState.distractors;
    if (keys.includes('hints')) this.hints = componentState.hints;
    if (keys.includes('nextDisabled')) this.nextDisabled = componentState.nextDisabled;
    this.userToken = state.userToken;
    this.user = state.user;
  }
}

function validate(concept: Concept, resource: string, questionStem: string, answer: string, distractors: string[], hints: string[]) {
    const empty = str => str == undefined || str.toString().trim() === '';
    const someEmpty = (bitOr, str) => bitOr || empty(str);
    const someEmptyAndNoPicture = (bitOr, obj) => bitOr || (empty(obj.text) && !obj.picture);
    if (!concept || (empty(concept.id) && empty(concept.title))) throw new Error('Concept must be entered or selected');
    if (empty(resource)) throw new Error('Resource must not be empty');
    if (empty(questionStem.text)) throw new Error('Question text must not be empty');
    if (empty(answer.text) && !answer.picture) throw new Error('You must provide a correct answer');
    if (distractors.length !== 3 || distractors.reduce(someEmptyAndNoPicture, false))
      throw new Error('Incorrect answers must not be empty');
    if (hints.length !== 4 || hints.reduce(someEmpty, false))
      throw new Error('Answer comments must not be empty');
}

window.customElements.define(PrendusMultipleChoiceScaffold.is, PrendusMultipleChoiceScaffold);
