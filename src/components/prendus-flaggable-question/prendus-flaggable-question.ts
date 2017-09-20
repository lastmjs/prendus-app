import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {User} from '../../typings/user';
import {createUUID, fireLocalAction} from '../../node_modules/prendus-shared/services/utilities-service';

class PrendusFlaggableQuestion extends Polymer.Element {
  loaded: boolean;
  action: SetPropertyAction | SetComponentPropertyAction;
  componentId: string;
  userToken: string | null;
  user: User;

  static get is() { return 'prendus-flaggable-question' }

  constructor() {
    super();
    this.componentId = createUUID();
  }

  connectedCallback() {
    super.connectedCallback();
    this.action = fireLocalAction('loaded', true);
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    const keys = Object.keys(componentState);
    this.loaded = componentState.loaded;
    this.userToken = state.userToken;
    this.user = state.user;
  }

}

window.customElements.define(PrendusFlaggableQuestion.is, PrendusFlaggableQuestion)
