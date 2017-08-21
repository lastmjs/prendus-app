import {SetComponentPropertyAction, SetPropertyAction, DefaultAction} from '../../typings/actions';
import {checkForUserToken} from '../../redux/actions';

class PrendusNotification extends Polymer.Element implements ContainerElement {
    componentId: string;
    action: SetComponentPropertyAction | SetPropertyAction | DefaultAction;
    userToken: string;
    static get is() { return 'prendus-notification'; }

    constructor() {
        super();
    }

    connectedCallback() {
        super.connectedCallback();
        this.shadowRoot.querySelector('#toast').open();
        this.shadowRoot.querySelector('#toast').text = 'WAHOOOO';

        this.openNotification();
    }
    openNotification(){
      setTimeout(() => {
        console.log(this.shadowRoot.querySelector('#toast'));
        this.shadowRoot.querySelector('#toast').open;
      }, 12000);

    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;

    }
}

window.customElements.define(PrendusNotification.is, PrendusNotification);
