import {createUUID, fireLocalAction} from '../../node_modules/prendus-shared/services/utilities-service';

class PrendusInfiniteList extends Polymer.Element {
  action: SetComponentPropertyAction;

  static get is() { return 'prendus-infinite-list' }

  static get properties() {
    return {
      next: {
        type: Function,
        observer: '_init'
      },
      pageSize: {
        type: Number,
        value: 20
      },
      cursor: {
        type: Number,
        value: 0
      },
      loading: Boolean
    }
  }

  constructor() {
    super();
    this.componentId = createUUID();
  }

  ready() {
    super.ready();
    this.action = fireLocalAction(this.componentId, 'list', this.shadowRoot.querySelector('#list'));
  }

  async _init(next: (i: number, n: number) => any[]) {
    this.action = fireLocalAction(this.componentId, 'loading', true);
    const items = await next(0, this.pageSize);
    this.action = fireLocalAction(this.componentId, 'cursor', this.pageSize);
    this.dispatchEvent(new CustomEvent('items-loaded', {detail: {items, init: true}});
    this.action = fireLocalAction(this.componentId, 'loading', false);
  }

  async loadMore(e: CustomEvent) {
    this.action = fireLocalAction(this.componentId, 'loading', true);
    const items = await this.next(this.cursor, this.pageSize);
    this.action = fireLocalAction(this.componentId, 'cursor', this.cursor + this.pageSize);
    this.dispatchEvent(new CustomEvent('items-loaded', {detail: {items, init: false}}));
    const threshold = this.shadowRoot.querySelector('#threshold');
    if (!items.length)
      threshold.lowerThreshold = null;
    else
      threshold.clearLower();
    this.action = fireLocalAction(this.componentId, 'loading', false);
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state.components[this.componentId] || {};
    this.cursor = state.cursor;
    this.list = state.list;
    this.loading = state.loading;
  }
}

window.customElements.define(PrendusInfiniteList.is, PrendusInfiniteList);
