import {removeUser, removeUserToken} from '../../redux/actions';

class PrendusAuthenticate extends Polymer.Element {
    action: SetPropertyAction;
    active: boolean;

    static get is() { return 'prendus-authenticate'; }
    static get properties() {
        return {
            active: {
                type: Boolean,
                observer: 'activeChanged'
            }
        };
    }

    activeChanged() {
        if (this.active) {
            this.action = removeUserToken();
            this.action = removeUser();
        }
    }

    getTail() {
        return window.location.search;
    }
}

window.customElements.define(PrendusAuthenticate.is, PrendusAuthenticate);
