import {removeUser, removeUserToken} from '../../redux/actions';
import {SetPropertyAction} from '../../typings/actions';

class PrendusAuthenticate extends Polymer.Element {
    action: SetPropertyAction;
    active: boolean;

    static get is() { return 'prendus-authenticate'; }
    static get properties() {
        return {
            active: {
                type: Boolean,
                observer: 'activeChanged'
            },
            redirectUrl: {
                type: String
            },
            linkLtiAccount: {
                type: Boolean
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
