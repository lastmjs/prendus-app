import {html} from '../../node_modules/lit-html/lit-html';
import {render} from '../../node_modules/lit-html/lib/lit-extended';
import {SetComponentPropertyAction, SetPropertyAction, DefaultAction} from '../../typings/actions';
import {State} from '../../typings/state';
import {createUUID, navigate, fireLocalAction} from '../../node_modules/prendus-shared/services/utilities-service';
import {Course} from '../../typings/course';
import {GQLRequest, GQLSubscribe} from '../../node_modules/prendus-shared/services/graphql-service';
import {User} from '../../typings/user';
import {checkForUserToken, getAndSetUser} from '../../redux/actions';
import {getStripeKey} from '../../services/utilities-service';

interface GQLCourse {
    price: number;
}

class PrendusCoursePayment extends Polymer.Element {
    stripeCheckoutHandler: StripeCheckoutHandler;
    courseId: string | null;
    action: any;
    state: State;
    componentId: string;
    course: GQLCourse | null;
    userToken: string | null;
    user: User | null;
    loaded: boolean;
    redirectUrl: string | null;

    static get is() { return 'prendus-course-payment'; }
    static get properties() {
        return {
            courseId: {
                observer: 'courseIdSet'
            },
            redirectUrl: {
                observer: 'redirectUrlSet'
            }
        };
    }

    constructor() {
        super();

        this.componentId = createUUID();
    }

    async courseIdSet() {
        this.action = fireLocalAction(this.componentId, 'courseId', this.courseId);
        this.action = fireLocalAction(this.componentId, 'loaded', false);
        this.action = checkForUserToken();
        this.action = await getAndSetUser();
        this.action = fireLocalAction(this.componentId, 'course', await loadCourse(this.courseId, this.userToken));
        this.action = fireLocalAction(this.componentId, 'loaded', true);
    }

    async redirectUrlSet() {
        this.action = checkForUserToken();
        this.action = await getAndSetUser();
    }

    connectedCallback() {
        super.connectedCallback();

        this.action = fireLocalAction(this.componentId, 'loaded', false);

        const options: StripeCheckoutOptions = {
            key: getStripeKey(),
            name: 'Prendus',
            image: 'images/favicon.png',
            zipCode: true,
            token: async (token: stripe.StripeTokenResponse) => {
                this.action = fireLocalAction(this.componentId, 'loaded', false);
                await initiatePayment(token.id, this.courseId || 'courseId is null', this.course ? this.course.price : 0, this.user ? this.user.id : 'user is null', this.userToken, this.user ? this.user.email : 'user is null');
                // navigate(decodeURIComponent(this.redirectUrl || '/'));
                window.location.href = decodeURIComponent(this.redirectUrl || '/'); //TODO we are only doing a hard refresh for now...I believe the assignment components haven't been designed to respond to dynamic property changes
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
        if (state.components[this.componentId]) this.loaded = state.components[this.componentId].loaded;
        this.userToken = state.userToken;
        this.user = state.user;
    }
}

window.customElements.define(PrendusCoursePayment.is, PrendusCoursePayment);

async function loadCourse(courseId: string | null, userToken: string | null): Promise<GQLCourse> {
    const data = await GQLRequest(`
        query($courseId: ID!) {
            Course(
                id: $courseId
            ) {
                price
                title
            }
        }
    `, {
        courseId
    }, userToken, (error: any) => {
        console.log(error);
        alert(error);
    });

    return data.Course;
}

async function initiatePayment(stripeTokenId: string, courseId: string, amount: number, userId: string, userToken: string | null, userEmail: string): Promise<void> {
    await GQLRequest(`
        mutation($userId: ID!, $courseId: ID!, $stripeTokenId: String!, $amount: Int!, $userEmail: String!) {
            coursePayment(
                userId: $userId
                courseId: $courseId
                stripeTokenId: $stripeTokenId
                amount: $amount
                userEmail: $userEmail
            ) {
                id
            }
        }
    `, {
        courseId,
        userId,
        amount,
        stripeTokenId,
        userEmail
    }, userToken, (error: any) => {
        console.log(error);
        alert(error);
    });
}
