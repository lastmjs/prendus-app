import {createUUID, fireLocalAction} from '../../node_modules/prendus-shared/services/utilities-service';

/**
 * TODO: Handle scrolling DOWN so that we don't keep too many records in memory.
 * TODO: Handle jumping between cursor positions by adding an observer to cursor to asynchronously reload the appropriate state
 */
class PrendusInfiniteList extends Polymer.Element {
  action: SetComponentPropertyAction;
  next: (i: number, n: number) => any[];
  cursor: number;
  pageSize: number;
  items: any[];
  as: string;
  indexAs: string;
  lowerThreshold: number;
  loading: boolean;

  static get is() { return 'prendus-infinite-list' }

  static get properties() {
    return {
      next: {
        type: Function,
        observer: '_init'
      },
      deleteItems: {
        type: Function,
        observer: '_deleteItems'
      },
      pageSize: {
        type: Number,
        value: 10
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
      lowerThreshold: {
        type: Number,
        value: 100,
        observer: '_lowerThresholdChanged'
      },
      loading: Boolean
    }
  }

  constructor() {
    super();
    this.componentId = createUUID();
  }

  connectedCallback() {
    super.connectedCallback();
    const list = this.shadowRoot.querySelector('#list');
    this.action = fireLocalAction(this.componentId, 'list', list);
    const template = this.querySelector('template');
    if (template)
      list.appendChild(template); //This is necessary because iron-list requires a template child but can't see our light-dom
  }

  _lowerThresholdChanged(lowerThreshold: number) {
    if (lowerThreshold)
      this.action = fireLocalAction(this.componentId, '_lowerThreshold', lowerThreshold);
  }

  async _init(next: (i: number, n: number) => any[]) {
    this.action = fireLocalAction(this.componentId, 'lowerThreshold', this.lowerThreshold);
    this.action = fireLocalAction(this.componentId, 'loading', true);
    const items = await next(0, this.pageSize);
    this.action = fireLocalAction(this.componentId, 'items', items);
    this.action = fireLocalAction(this.componentId, 'cursor', this.pageSize);
    this.action = fireLocalAction(this.componentId, 'loading', false);
    this.dispatchEvent(new CustomEvent('items-loaded'));
  }
  async _deleteItems(deleteItems: (items: any[]) => any[]){
    const deletedItems = await deleteItems(this.items);
    deletedItems.map((deletedItem: any)=>{
      this.splice('items', this.items.indexOf(deletedItem), 1);
    });
  }

  async loadMore(e: CustomEvent) {
    this.action = fireLocalAction(this.componentId, 'loading', true);
    const items = await this.next(this.cursor, this.pageSize);
    this.push('items', ...items); //Mutation necessary to keep scroll position in the list
    this.action = fireLocalAction(this.componentId, 'cursor', this.cursor + this.pageSize);
    const threshold = this.shadowRoot.querySelector('#threshold');
    if (items.length < this.pageSize)
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
    this._lowerThreshold = state._lowerThreshold;
  }
}

window.customElements.define(PrendusInfiniteList.is, PrendusInfiniteList);
