import {SetComponentPropertyAction} from '../../typings/actions';
import {createUUID} from '../../services/utilities-service';

class PrendusQuestionCarousel extends Polymer.Element {
  action: SetPropertyAction | SetComponentPropertyAction;
  componentId: string;
  finished: boolean = false;

  static get is() { return 'prendus-question-carousel' }

  static get properties() {
    return {
      questions: {
        type: Array,
        observer: '_initCarousel'
      },
      currentIndex: {
        type: Number,
        value: 0
      },
      nextText: {
        type: String,
        value: 'Next'
      },
      backText: {
        type: String,
        value: 'Back'
      },
      hideBack: {
        type: Boolean,
        value: false
      },
      hideNext: {
        type: Boolean,
        value: false
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

  _initCarousel(questions: Object[]) {
    this._fireLocalAction('currentIndex', 0);
    this._fireLocalAction('finished', false);
    this._notifyNextQuestion(questions.length ? questions[0] : null);
  }

  _plusOne(num: number): number {
    return num + 1;
  }

  nextQuestion() {
    if (this.currentIndex < this.questions.length) {
      const index = this.currentIndex + 1;
      this._fireLocalAction('currentIndex', index);
      if (index < this.questions.length)
        this._notifyNextQuestion(this.questions[index]);
      else {
        this._fireLocalAction('finished', true);
        this._notifyNextQuestion(null);
      }
    }
  }

  previousQuestion() {
    this._fireLocalAction('finished', false);
    if (this.currentIndex > 0) {
      const index = this.currentIndex - 1;
      this._fireLocalAction('currentIndex', index);
      this._notifyNextQuestion(this.questions[index]);
    }
  }

  _notifyNext() {
    const evt = new Event('question-carousel-next', {
      bubbles: false,
      composed: true,
    });
    this.dispatchEvent(evt);
  }

  _notifyNextQuestion(question: Object) {
    const evt = new CustomEvent('question-carousel-question', {
      bubbles: false,
      composed: true,
      detail: {question}
    });
    this.dispatchEvent(evt);
  }

  stateChange(e) {
    const componentState = e.detail.state.components[this.componentId];
    const keys = Object.keys(componentState || {});
    if (keys.includes('currentIndex')) this.currentIndex = componentState.currentIndex;
    if (keys.includes('finished')) this.finished = componentState.finished;
    if (keys.includes('question')) this.question = componentState.question;
  }
}

window.customElements.define(PrendusQuestionCarousel.is, PrendusQuestionCarousel)
