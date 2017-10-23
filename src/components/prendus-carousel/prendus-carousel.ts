import {
  createUUID,
  fireLocalAction
} from '../../node_modules/prendus-shared/services/utilities-service';
import {SetComponentPropertyAction} from '../../typings/index.d';

export class PrendusCarousel extends Polymer.Element {
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
      current: {
        type: Object,
        notify: true
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
        notify: true
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

  _initCarousel(data: any[], old) {
    this.action = fireLocalAction(this.componentId, 'currentIndex', 0);
    this.action = fireLocalAction(this.componentId, 'current', data[0]);
  }

  _plusOne(num: number): number {
    return num + 1;
  }

  next() {
    if (!this.finished) {
      const index = this.currentIndex + 1;
      this.action = fireLocalAction(this.componentId, 'currentIndex', index);
      this.action = fireLocalAction(this.componentId, 'current', this.data[index]);
    }
  }

  previous() {
    if (this.currentIndex > 0) {
      const index = this.currentIndex - 1;
      this.action = fireLocalAction(this.componentId, 'currentIndex', index);
      this.action = fireLocalAction(this.componentId, 'current', this.data[index]);
    }
  }

  _hideNext(hideNext: boolean, finished: boolean) {
    return hideNext || finished;
  }

  _notifyNext() {
    this.dispatchEvent(new CustomEvent('carousel-next'));
  }

  stateChange(e: CustomEvent) {
    const componentState = e.detail.state.components[this.componentId] || {};
    this.currentIndex = componentState.currentIndex;
    this.finished = componentState.finished;
    this.current = componentState.current;
  }
}

window.customElements.define(PrendusCarousel.is, PrendusCarousel)
