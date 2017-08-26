import {html} from '../../node_modules/lit-html/lit-html';
import {render} from '../../node_modules/lit-html/lib/lit-extended';
import {SetComponentPropertyAction, DefaultAction} from '../../typings/actions';
import {State} from '../../typings/state';
import {createUUID} from '../../services/utilities-service';

class PrendusPayment extends HTMLElement {
    stripeCheckoutHandler: StripeCheckoutHandler;
    _courseId: string | null;
    action: SetComponentPropertyAction | DefaultAction;
    state: State;
    componentId: string;

    constructor() {
        super();

        this.componentId = createUUID();
    }

    get courseId() {
        return this._courseId;
    }

    set courseId(val: string | null) {
        this.action = fireLocalAction(this.componentId, '_courseId', val);
    }

    connectedCallback() {
        this.attachShadow({mode: 'open'});

        const options: StripeCheckoutOptions = {

        };
        this.stripeCheckoutHandler = StripeCheckout.configure(options);

        this.action = {
            type: 'DEFAULT_ACTION'
        };
        this.stateChange(null);
    }

    openModal() {
        this.stripeCheckoutHandler.open();
    }

    stateChange(e: CustomEvent | null) {
        const state: State = e ? e.detail.state : null;

        if (state === this.state) {
            return;
        }

        //TODO figure out the Redux stuff. Figure out the nulls and everything with state
        this.state = state;
        this._courseId = state.components[this.componentId]._courseId;

        render(html`
            <redux-store action="${this.action}" on-statechange="${() => this.stateChange.bind(this)}"></redux-store>

            <p>The courseId is ${this.courseId}</p>
            <button onclick=${() => this.openModal.bind(this)}>Pay</button>
        `, this.shadowRoot || this);
    }
}

window.customElements.define('prendus-payment', PrendusPayment);

async function loadCourse(courseId: string) {
    // const data = await GQLQuery();
}

function fireLocalAction(componentId: string, key: string, value: any): SetComponentPropertyAction {
    return {
        type: 'SET_COMPONENT_PROPERTY',
        componentId,
        key,
        value
    };
}
