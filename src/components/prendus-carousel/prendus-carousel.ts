import {
  createUUID,
  fireLocalAction
} from '../../node_modules/prendus-shared/services/utilities-service';
import {SetComponentPropertyAction} from '../../typings/index.d';

class PrendusCarousel extends Polymer.Element {
  action: SetComponentPropertyAction;
  componentId: string;
  data: any[];
  label: string;
  currentIndex: number;
  nextText: string;
  backText: string;
  hideBack: boolean;
  hideNext: boolean;
  finished: boolean = false;

  static get is() { return 'prendus-carousel' }

  static get properties() {
    return {
      data: {
        type: Array,
        observer: '_initCarousel'
      },
      label: {
        type: String,
        value: 'Question'
      }
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
      },
      finished: {
        type: Boolean,
        computed: '_computeFinished(data, currentIndex)'
      }
    }
  }

  constructor() {
    super();
    this.componentId = createUUID();
  }

  connectedCallback() {
    super.connectedCallback();
    this.action = fireLocalAction(this.componentId, 'loaded', true);
  }

  _computeFinished(data: any[], currentIndex: number): boolean {
    return !data || !data.length || currentIndex === data.length - 1;
  }

  _initCarousel(data: any[]) {
    this.action = fireLocalAction(this.componentId, 'currentIndex', 0);
    this._notifyNextData(data.length ? data[0] : null);
  }

  _plusOne(num: number): number {
    return num + 1;
  }

  nextData() {
    if (this.currentIndex < this.data.length) {
      const index = this.currentIndex + 1;
      this.action = fireLocalAction(this.componentId, 'currentIndex', index);
      if (index < this.data.length)
        this._notifyNextData(this.data[index]);
      else {
        this._notifyNextData(null);
      }
    }
  }

  previousData() {
    if (this.currentIndex > 0) {
      const index = this.currentIndex - 1;
      this.action = fireLocalAction(this.componentId, 'currentIndex', index);
      this._notifyNextQuestion(this.data[index]);
    }
  }

  _hideNext(hideNext: boolean, finished: boolean) {
    return hideNext || finished;
  }

  _notifyNext() {
    this.dispatchEvent(new CustomEvent('carousel-next', {composed: true}));
  }

  _notifyNextData(data: any) {
    const evt = new CustomEvent('carousel-data', {
      detail: {data}
    });
    this.dispatchEvent(evt);
  }

  stateChange(e: CustomEvent) {
    const componentState = e.detail.state.components[this.componentId] || {};
    this.currentIndex = componentState.currentIndex;
    this.finished = componentState.finished;
    this.current = componentState.current;
  }
}

window.customElements.define(PrendusCarousel.is, PrendusCarousel)
