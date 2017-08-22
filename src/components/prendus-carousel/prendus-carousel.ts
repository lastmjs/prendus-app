import {SetComponentPropertyAction} from '../../typings/actions';
import {createUUID} from '../../services/utilities-service';

class PrendusCarousel extends Polymer.Element {
  action: SetPropertyAction | SetComponentPropertyAction;
  componentId: string;
  finished: boolean = false;

  static get is() { return 'prendus-carousel' }

  static get properties() {
    return {
      data: {
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

  _initCarousel(data: Object[]) {
    this._fireLocalAction('currentIndex', 0);
    this._fireLocalAction('finished', false);
    this._notifyNextData(data.length ? data[0] : null);
  }

  _plusOne(num: number): number {
    return num + 1;
  }

  nextData() {
    if (this.currentIndex < this.data.length) {
      const index = this.currentIndex + 1;
      this._fireLocalAction('currentIndex', index);
      if (index < this.data.length)
        this._notifyNextData(this.data[index]);
      else {
        this._fireLocalAction('finished', true);
        this._notifyNextData(null);
      }
    }
  }

  previousData() {
    this._fireLocalAction('finished', false);
    if (this.currentIndex > 0) {
      const index = this.currentIndex - 1;
      this._fireLocalAction('currentIndex', index);
      this._notifyNextQuestion(this.data[index]);
    }
  }

  _hideNext(hideNext: boolean, finished: boolean) {
    return hideNext || finished;
  }

  _notifyNext() {
    const evt = new Event('carousel-next', {
      bubbles: false,
      composed: true,
    });
    this.dispatchEvent(evt);
  }

  _notifyNextData(data: Object) {
    const evt = new CustomEvent('carousel-data', {
      bubbles: false,
      composed: true,
      detail: {data}
    });
    this.dispatchEvent(evt);
  }

  stateChange(e) {
    const componentState = e.detail.state.components[this.componentId];
    const keys = Object.keys(componentState || {});
    if (keys.includes('currentIndex')) this.currentIndex = componentState.currentIndex;
    if (keys.includes('finished')) this.finished = componentState.finished;
    if (keys.includes('current')) this.current = componentState.current;
  }
}

window.customElements.define(PrendusCarousel.is, PrendusCarousel)
