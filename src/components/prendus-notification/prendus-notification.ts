import {SetComponentPropertyAction, SetPropertyAction, DefaultAction} from '../../typings/actions';
import {checkForUserToken} from '../../redux/actions';

class PrendusNotification extends Polymer.Element implements ContainerElement {
    componentId: string;
    action: SetComponentPropertyAction | SetPropertyAction | DefaultAction;
    userToken: string;
    message: string;

    static get is() { return 'prendus-notification'; }
    static get properties() {
      return {
        message: {
          type: String,
          observer: "openNotification"
        }
      };
    }
    constructor() {
        super();
    }

    connectedCallback() {
        super.connectedCallback();
        this.openNotification();
    }
    openNotification(){
      this.shadowRoot.querySelector('#toast').open();
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;

    }
}

window.customElements.define(PrendusNotification.is, PrendusNotification);
