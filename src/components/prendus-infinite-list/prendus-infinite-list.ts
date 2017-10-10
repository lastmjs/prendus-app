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
      items: {
        type: Array,
        value: []
      },
      as: {
        type: String,
        value: 'item'
      },
      indexAs: {
        type: String,
        value: 'index'
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
    const list = this.shadowRoot.querySelector('#list');
    this.action = fireLocalAction(this.componentId, 'list', list);
    const template = this.querySelector('template');
    if (template)
      list.appendChild(template);
  }

  async _init(next: (i: number, n: number) => any[]) {
    this.action = fireLocalAction(this.componentId, 'lowerThreshold', 20);
    this.action = fireLocalAction(this.componentId, 'loading', true);
    const items = await next(0, this.pageSize);
    this.action = fireLocalAction(this.componentId, 'items', items);
    this.action = fireLocalAction(this.componentId, 'cursor', this.pageSize);
    this.action = fireLocalAction(this.componentId, 'loading', false);
  }

  async loadMore(e: CustomEvent) {
    this.action = fireLocalAction(this.componentId, 'loading', true);
    const items = await this.next(this.cursor, this.pageSize);
    this.action = fireLocalAction(this.componentId, 'items', [...this.items, ...items]);
    this.action = fireLocalAction(this.componentId, 'cursor', this.cursor + this.pageSize);
    const threshold = this.shadowRoot.querySelector('#threshold');
    if (!items.length)
      this.action = fireLocalAction(this.componentId, 'lowerThreshold', null);
    else
      threshold.clearLower();
    this.action = fireLocalAction(this.componentId, 'loading', false);
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state.components[this.componentId] || {};
    this.cursor = state.cursor;
    this.loading = state.loading;
    this.items = state.items;
    this.list = state.list;
    this.lowerThreshold = state.lowerThreshold;
  }
}

window.customElements.define(PrendusInfiniteList.is, PrendusInfiniteList);
