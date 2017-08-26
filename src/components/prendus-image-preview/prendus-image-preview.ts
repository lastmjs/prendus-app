import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {User} from '../../typings/user';
import {createUUID} from '../../services/utilities-service';

class PrendusImagePreview extends Polymer.Element {
  loaded: boolean;
  action: SetPropertyAction | SetComponentPropertyAction;
  componentId: string;
  src: string;
  userToken: string | null;
  user: User;

  static get is() { return 'prendus-image-preview' }

  static get properties() {
    return {
      file: {
        type: Object,
        observer: '_init'
      }
    }
  }

  constructor() {
    super();
    this.componentId = createUUID();
  }

  _fireLocalAction(key: string, value: any) {
    this.action = {
      type: 'SET_COMPONENT_PROPERTY',
      componentId: this.componentId,
      key,
      value
    };
  }

  connectedCallback() {
    super.connectedCallback();
    this._fireLocalAction('loaded', true);
  }

  clear() {
    this._fireLocalAction('src', '');
  }

  _init(file: File) {
    if (!file) {
      this.clear();
      return;
    }
    const reader = new FileReader();
    reader.onload = this._setSrc.bind(this);
    reader.readAsDataURL(file);
  }

  _setSrc(e: Event) {
    this._fireLocalAction('src', e.target.result);
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    const keys = Object.keys(componentState);
    if (keys.includes('loaded')) this.loaded = componentState.loaded;
    if (keys.includes('src')) this.src = componentState.src;
    this.userToken = state.userToken;
    this.user = state.user;
  }

}

window.customElements.define(PrendusImagePreview.is, PrendusImagePreview)
