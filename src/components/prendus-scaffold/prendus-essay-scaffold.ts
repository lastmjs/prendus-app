import {createUUID} from '../../node_modules/prendus-shared/services/utilities-service';
import {GQLSaveFile} from '../../services/graphql-file-service';
import {generateEssay} from '../../services/question-to-code-service';
import {setNotification} from '../../redux/actions';
import {
  EXAMPLE_GRADING_RUBRIC,
  DEFAULT_EVALUATION_RUBRIC,
  ASSIGNMENT_VALIDATION_ERROR,
  NotificationType,
  DEFAULT_QUESTION_LICENSE_ID
} from '../../services/constants-service';

class PrendusEssayScaffold extends Polymer.Element {
  loaded: boolean;
  action: SetPropertyAction | SetComponentPropertyAction;
  componentId: string;
  step: number;
  concept: Concept;
  questionText: string;
  resource: string;
  rubric: Rubric;
  picture: File;
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
    this._fireLocalAction('concept', {});
    this._fireLocalAction('picture', null);
    //Can't be done through data binding so we need this mutation
    this.shadowRoot.getElementById('question-picture').value = '';
  }

  _handleConcept(e: CustomEvent) {
    this._fireLocalAction('concept', e.detail.concept);
    this._fireLocalAction('nextDisabled', !this.stepCompleted(1));
  }

  _handleRubric(e: CustomEvent) {
    this._fireLocalAction('rubric', e.detail.value);
  }

  _triggerPicture(e: Event) {
    this.shadowRoot.querySelector('#question-picture').click();
  }

  _handleQuestionPicture(e: Event) {
    if (!e.target || !e.target.files || !e.target.files[0])
      return;
    const file = e.target.files[0];
    const ext = file.name.substr(file.name.lastIndexOf('.') + 1).toLowerCase();
    if (ext !== 'png' && ext !== 'gif' && ext !== 'jpeg' && ext !== 'jpg') {
      this.action = setNotification('The file does not have an image file extension.', NotificationType.ERROR);
      return;
    }
    this._fireLocalAction('picture', file);
  }

  exampleRubric(): Object[] {
    return EXAMPLE_GRADING_RUBRIC;
  }

  setQuestionText(e: Event) {
    this._fireLocalAction('questionText', e.target.value);
    this._fireLocalAction('nextDisabled', !this.stepCompleted(3));
  }

  setResource(e: Event) {
    this._fireLocalAction('resource', e.target.value);
    this._fireLocalAction('nextDisabled', !this.stepCompleted(2));
  }

  stepCompleted(step: number): boolean {
    switch (step) {
      case 1: return this.concept && (this.concept.id || this.concept.title);
      case 2: return this.resource;
      case 3: return this.questionText;
      default: return true;
    }
  }

  back(): void {
    this._fireLocalAction('step', this.step - 1);
    this._fireLocalAction('nextDisabled', false);
  }

  next(): void {
    this._fireLocalAction('step', this.step + 1);
    this._fireLocalAction('nextDisabled', !this.stepCompleted(this.step));
  }

  async submit(): void {
    try {
      validate(this.concept, this.resource, this.questionText, this.rubric);
    } catch (e) {
      this.dispatchEvent(new CustomEvent(ASSIGNMENT_VALIDATION_ERROR));
      this.action = setNotification(e.message, NotificationType.ERROR);
      return;
    }
    const images = this.picture ? [(await GQLSaveFile(this.picture))] : [];
    const imageIds = images.map(image => image.id);
    const imageUrls = images.map(image => image.url.replace(/files/, 'images') + '/x300');
    const { text, code } = generateEssay({
      stem: this.questionText
      gradingRubric: this.rubric,
      evaluationRubric: DEFAULT_EVALUATION_RUBRIC,
      imageUrls
    });
    const question = {
      authorId: this.user.id,
      assignmentId: this.assignment.id,
      resource: this.resource,
      ...this.concept.id && { conceptId: this.concept.id },
      ...!this.concept.id && { concept: this.concept },
      text,
      code,
      imageIds,
      answerComments: [],
      visibility: 'COURSE',
      licenseId: DEFAULT_QUESTION_LICENSE_ID
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
    if (keys.includes('picture')) this.picture = componentState.picture;
    if (keys.includes('nextDisabled')) this.nextDisabled = componentState.nextDisabled;
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
