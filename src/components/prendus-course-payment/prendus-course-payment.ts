import {html} from '../../node_modules/lit-html/lit-html';
import {render} from '../../node_modules/lit-html/lib/lit-extended';
import {SetComponentPropertyAction, DefaultAction} from '../../typings/actions';
import {State} from '../../typings/state';
import {createUUID} from '../../services/utilities-service';
import {Course} from '../../typings/course';
import {GQLQuery} from '../../services/graphql-service';

interface GQLCourse {
    price: string;
}

class PrendusCoursePayment extends Polymer.Element {
    stripeCheckoutHandler: StripeCheckoutHandler;
    courseId: string | null;
    action: SetComponentPropertyAction | DefaultAction;
    state: State;
    componentId: string;
    course: GQLCourse | null;
    userToken: string | null;

    static get is() { return 'prendus-course-payment'; }
    static get properties() {
        return {
            courseId: {
                observer: 'courseIdSet'
            }
        };
    }

    constructor() {
        super();

        this.componentId = createUUID();
    }

    async courseIdSet() {
        this.action = fireLocalAction(this.componentId, 'courseId', this.courseId);
        this.action = fireLocalAction(this.componentId, 'course', await loadCourse(this.courseId, this.userToken));
    }

    connectedCallback() {
        super.connectedCallback();

        const options: StripeCheckoutOptions = {

        };
        this.stripeCheckoutHandler = StripeCheckout.configure(options);
    }

    openModal() {
        this.stripeCheckoutHandler.open();
    }

    stateChange(e: CustomEvent) {
        const state: State = e.detail.state;

        if (state.components[this.componentId]) this.courseId = state.components[this.componentId].courseId;
        if (state.components[this.componentId]) this.course = state.components[this.componentId].course;
        this.userToken = state.userToken;
    }
}

window.customElements.define(PrendusCoursePayment.is, PrendusCoursePayment);

async function loadCourse(courseId: string | null, userToken: string | null): Promise<GQLCourse> {
    const data = await GQLQuery(`
        query {
            Course(
                id: "${courseId}"
            ) {
                price
            }
        }
    `, userToken, () => {}, () => {});

    return data.Course;
}

function fireLocalAction(componentId: string, key: string, value: any): SetComponentPropertyAction {
    return {
        type: 'SET_COMPONENT_PROPERTY',
        componentId,
        key,
        value
    };
}
