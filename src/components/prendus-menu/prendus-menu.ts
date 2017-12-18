import {GQLRequest} from '../../node_modules/prendus-shared/services/graphql-service';
import {createUUID, fireLocalAction, navigate} from '../../node_modules/prendus-shared/services/utilities-service';
import {EMAIL_REGEX, NotificationType} from '../../services/constants-service';
import {SetPropertyAction, DefaultAction} from '../../typings/actions';
import {setNotification, checkForUserToken, getAndSetUser, removeUser, removeUserToken} from '../../redux/actions';
import {User} from '../../typings/user';

class PrendusMenu extends Polymer.Element {
    action: SetPropertyAction | DefaultAction;
    user: User;
    userToken: string;
    componentId: string;
    menuOpen: boolean;

    static get is() { return 'prendus-menu'; }

    constructor() {
      super();
      this.componentId = createUUID();
    }

    async connectedCallback() {
      super.connectedCallback();
      this.action = fireLocalAction(this.componentId, 'menuOpen', true)
    }

    logout() {
      if (this.userToken){
        this.action = removeUser();
        this.action = removeUserToken();
        navigate(`/login`)
      }
    }
    changeMenuOpen(e){
      (e.detail.value === false) ? this.action = {type: 'SET_PROPERTY', key: 'menuOpen', value: false} : this.action = {type: 'SET_PROPERTY', key: 'menuOpen', value: true};
    }
    openUserInfoDialog(){
      this.shadowRoot.querySelector('#user-info').opened === true ? this.shadowRoot.querySelector('#user-info').close() :  this.shadowRoot.querySelector('#user-info').open()
    }
    modalChangeLog(e){
      console.log('e.change', e)
    }
    closeUserInfoDialog(e){
      this.shadowRoot.querySelector('#user-info').close();
    }
    stateChange(e: CustomEvent) {
        const state: State = e.detail.state;
        const componentState = state.components[this.componentId] || {};
        const keys = Object.keys(componentState);
        this.menuOpen = state.menuOpen;
        this.user = state.user;
        this.userToken = state.userToken;
    }
}

window.customElements.define(PrendusMenu.is, PrendusMenu);
