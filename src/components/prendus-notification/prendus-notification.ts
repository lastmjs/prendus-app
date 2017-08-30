import {SetComponentPropertyAction, SetPropertyAction, DefaultAction} from '../../typings/actions';
import {checkForUserToken} from '../../redux/actions';
import {createUUID} from '../../node_modules/prendus-shared/services/utilities-service';
import {Notification} from '../../typings/notification';

class PrendusNotification extends Polymer.Element implements ContainerElement {
    componentId: string;
    action: SetComponentPropertyAction | SetPropertyAction | DefaultAction;
    userToken: string;
    notificationMessage: string;
    notificationType: string;
    notification: Notification;
    duration: number;

    static get is() { return 'prendus-notification'; }
    static get properties() {
      return {
        notification: {
          type: Object,
          observer: "openNotification"
        }
      };
    }
    constructor() {
        super();
        this.componentId = createUUID();
    }

    connectedCallback() {
        super.connectedCallback();
        this.openNotification();
    }
    _fireLocalAction(key: string, value: any) {
      this.action = {
          type: 'SET_COMPONENT_PROPERTY',
        componentId: this.componentId,
        key,
        value
      };
    }
    openNotification(){
      if(this.notification){
        //If a notification is more than 7 seconds, we need a modal or to take the person to another page
        const notificationDuration = Math.min(((this.notification.message.length * 75) + 400), 3000);
        this._fireLocalAction("notificationMessage", this.notification.message);
        this._fireLocalAction("duration", notificationDuration);
        this.shadowRoot.querySelector('#toast').open();
      }
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        if (Object.keys(state.components[this.componentId] || {}).includes('notificationMessage')) this.notificationMessage = state.components[this.componentId].notificationMessage;
        if (Object.keys(state.components[this.componentId] || {}).includes('duration')) this.duration = state.components[this.componentId].duration;
    }
}

window.customElements.define(PrendusNotification.is, PrendusNotification);
