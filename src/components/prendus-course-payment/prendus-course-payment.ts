import {html} from '../../node_modules/lit-html/lit-html';
import {render} from '../../node_modules/lit-html/lib/lit-extended';
import {SetComponentPropertyAction, DefaultAction} from '../../typings/actions';
import {State} from '../../typings/state';
import {createUUID} from '../../services/utilities-service';
import {Course} from '../../typings/course';
import {GQLQuery} from '../../services/graphql-service';

interface GQLCourse {
    price: number;
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
            key: 'pk_test_K1aLpc89HokLmD9GDjhWmqix',
            name: 'Prendus',
            image: 'images/favicon.png',
            zipCode: true,
            token: (token: stripe.StripeTokenResponse) => {
                initiatePayment(token.id, this.userToken);
            }
        };
        this.stripeCheckoutHandler = StripeCheckout.configure(options);
    }

    getDollarAmount(price: number) {
        return price / 100;
    }

    openModal() {
        this.stripeCheckoutHandler.open({
            amount: this.course ? this.course.price : -1
        });
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
                title
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

async function initiatePayment(tokenId: string, userToken: string | null): Promise<void> {
    console.log('tokenId', tokenId);
    console.log('userToken', userToken);
}
