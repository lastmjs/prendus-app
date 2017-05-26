import {RootReducer} from '../../redux/reducers';

class PrendusApp extends Polymer.Element {
    static get is() { return 'prendus-app'; }

    connectedCallback() {
        super.connectedCallback();

        this.rootReducer = RootReducer;
    }
}

window.customElements.define(PrendusApp.is, PrendusApp);
