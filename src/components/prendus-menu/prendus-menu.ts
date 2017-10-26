import {GQLRequest} from '../../node_modules/prendus-shared/services/graphql-service';
import {fireLocalAction, navigate} from '../../node_modules/prendus-shared/services/utilities-service';
import {EMAIL_REGEX, NotificationType} from '../../services/constants-service';
import {setNotification} from '../../redux/actions';

class PrendusMenu extends Polymer.Element {
    static get is() { return 'prendus-menu'; }
    static get properties() {

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
