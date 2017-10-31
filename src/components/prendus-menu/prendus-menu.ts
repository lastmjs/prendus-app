import {GQLRequest} from '../../node_modules/prendus-shared/services/graphql-service';
import {fireLocalAction, navigate} from '../../node_modules/prendus-shared/services/utilities-service';
import {EMAIL_REGEX, NotificationType} from '../../services/constants-service';
import {SetPropertyAction, DefaultAction} from '../../typings/actions';
import {setNotification, checkForUserToken, getAndSetUser, removeUser, removeUserToken} from '../../redux/actions';
import {User} from '../../typings/user';

class PrendusMenu extends Polymer.Element {
    action: SetPropertyAction | DefaultAction;
    user: User;
    userToken: string;
    componentId: string;

    static get is() { return 'prendus-menu'; }

    logout() {
      if (this.userToken){
        this.action = removeUser();
        this.action = removeUserToken();
        navigate(`/login`)
      }
    }

    stateChange(e: CustomEvent) {
        const state: State = e.detail.state;
        const componentState = state.components[this.componentId] || {};
        const keys = Object.keys(componentState);

        this.user = state.user;
        this.userToken = state.userToken;
    }
}

window.customElements.define(PrendusMenu.is, PrendusMenu);
