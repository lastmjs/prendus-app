import {html} from '../../node_modules/lit-html/lit-html';
import {render} from '../../node_modules/lit-html/lib/lit-extended';
import {SetComponentPropertyAction, DefaultAction} from '../../typings/actions';
import {State} from '../../typings/state';
import {createUUID} from '../../services/utilities-service';
import {Course} from '../../typings/course';
import {GQLQuery, GQLMutate} from '../../services/graphql-service';
import {User} from '../../typings/user';

interface GQLCourse {
    price: number;
}

//TODO we must add a loading... thing to ensure that the course and price are loaded or they could accidentally click the pay now button before the price is set
class PrendusCoursePayment extends Polymer.Element {
    stripeCheckoutHandler: StripeCheckoutHandler;
    courseId: string | null;
    action: SetComponentPropertyAction | DefaultAction;
    state: State;
    componentId: string;
    course: GQLCourse | null;
    userToken: string | null;
    user: User | null;

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
                initiatePayment(token.id, this.courseId || 'courseId is null', this.course ? this.course.price : 0, this.user ? this.user.id : 'user is null', this.userToken);
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
        this.user = state.user;
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

async function initiatePayment(tokenId: string, courseId: string, amount: number, userId: string, userToken: string | null): Promise<void> {
    await GQLMutate(`
        mutation {
            createPurchase(
                userId: "${userId}"
                amount: ${amount}
                courseId: "${courseId}"
                stripeTokenId: "${tokenId}"
            ) {
                id
            }
        }
    `, userToken, (error: any) => {
        console.log(error);
    });
}
