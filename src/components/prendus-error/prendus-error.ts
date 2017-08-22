import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {createUUID} from '../../services/utilities-service';

class PrendusError extends Polymer.Element {
  loaded: boolean;
  action: SetPropertyAction | SetComponentPropertyAction;
  componentId: string;
  error: object;

  static get is() { return 'prendus-error' }
  static get properties() {
    return {
      error: {
        type: Object,
        observer: '_errorChanged'
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

  close() {
    this._fireLocalAction('contentClass', 'hide');
  }

  _errorChanged(err) {
    this._fireLocalAction('contentClass', '');
  }

  _fireLocalAction(key: string, value: any) {
    this.action = {
      type: 'SET_COMPONENT_PROPERTY',
      componentId: this.componentId,
      key,
      value
    };
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    const keys = Object.keys(componentState);
    if (keys.includes('loaded')) this.loaded = componentState.loaded;
    if (keys.includes('error')) this.error = componentState.error;
    if (keys.includes('contentClass')) this.contentClass = componentState.contentClass;
  }

}

window.customElements.define(PrendusError.is, PrendusError)
