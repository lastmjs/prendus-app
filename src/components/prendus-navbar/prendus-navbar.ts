import {GQLRequest} from '../../node_modules/prendus-shared/services/graphql-service';
import {fireLocalAction, navigate} from '../../node_modules/prendus-shared/services/utilities-service';
import {EMAIL_REGEX, NotificationType} from '../../services/constants-service';
import {checkForUserToken, getAndSetUser, removeUser, removeUserToken} from '../../redux/actions';
import {setNotification} from '../../redux/actions';

class PrendusNavbar extends Polymer.Element {
    static get is() { return 'prendus-navbar'; }
    static get properties() {

    }
    toggleDrawer(e: Event){
      this.shadowRoot.querySelector('#drawer').toggle();
    }
    logout() {
      if (this.userToken){
        this.action = removeUser();
        this.action = removeUserToken();
        navigate(`/login`)
      }
    }
    openMenu(){
      this.action = {
          type: 'SET_PROPERTY',
          key: 'menuOpen',
          value: true
      };
    }
    stateChange(e: CustomEvent) {
        const state: State = e.detail.state;
        const componentState = state.components[this.componentId] || {};
        const keys = Object.keys(componentState);
        this.user = state.user;
        this.userToken = state.userToken;
    }
}

window.customElements.define(PrendusNavbar.is, PrendusNavbar);
