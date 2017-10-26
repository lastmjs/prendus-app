import {
  createUUID,
  fireLocalAction
} from '../../node_modules/prendus-shared/services/utilities-service';
import {SetComponentPropertyAction} from '../../typings/index.d';

class PrendusCarousel extends Polymer.Element {
  action: SetComponentPropertyAction;
  componentId: string;
  items: any[];
  item: any;
  index: number;
  label: string;
  nextText: string;
  backText: string;
  hideBack: boolean;
  hideNext: boolean;
  finished: boolean;

  static get is() { return 'prendus-carousel' }

  static get properties() {
    return {
      items: {
        type: Array,
        notify: true,
        observer: '_initCarousel'
      },
      label: {
        type: String,
        value: 'Question'
      }
      index: {
        type: Number,
        value: 0
      },
      item: {
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
        value: false,
        computed: '_computeFinished(items, index)'
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

  _computeFinished(items: any[], index: number): boolean {
    return !items || index === items.length;
  }

  _initCarousel(items: any[]) {
    this.action = fireLocalAction(this.componentId, 'index', 0);
    this.action = fireLocalAction(this.componentId, 'item', items[0]);
  }

  _plusOne(num: number): number {
    return num + 1;
  }

  next() {
    if (!this.finished) {
      const index = this.index + 1;
      this.action = fireLocalAction(this.componentId, 'index', index);
      this.action = fireLocalAction(this.componentId, 'item', this.items[index]);
    }
  }

  previous() {
    if (this.index > 0) {
      const index = this.index - 1;
      this.action = fireLocalAction(this.componentId, 'index', index);
      this.action = fireLocalAction(this.componentId, 'item', this.items[index]);
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
    this.index = componentState.index;
    this.finished = componentState.finished;
    this.item = componentState.item;
  }
}

window.customElements.define(PrendusCarousel.is, PrendusCarousel)
