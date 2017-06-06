import {ContainerElement} from '../../typings/container-element';
import {State} from '../../typings/state';
import {GQLQuery, GQLMutate, GQLSubscribe} from '../../services/graphql-service';
import {SetPropertyAction} from '../../typings/actions';
import {User} from '../../typings/user';
import {persistUserToken} from '../../redux/actions';

class PrendusLogin extends Polymer.Element implements ContainerElement {
    componentId: string;
    action: SetPropertyAction;
    userToken: string | null;
    user: User | null;

    static get is() { return 'prendus-login'; }

    async connectedCallback() {
        super.connectedCallback();

        this.componentId = this.shadowRoot.querySelector('#reduxStoreElement').elementId;
    }

    loadData() {

    }

    subscribeToData() {

    }

    async loginClick() {
        const email: string = this.shadowRoot.querySelector('#emailInput').value;
        const password: string = this.shadowRoot.querySelector('#passwordInput').value;
        const data = await performMutation(email, password, this.userToken);
        const GQLEmail = await readEmail(email, password, data.signinUser.token)
        this.action = persistUserToken(data.signinUser.token);
        this.action = setUserInRedux(GQLEmail.User);
        if (data.signinUser.token === this.userToken && (this.user && this.user.id === GQLEmail)) alert('user logged in successfully');
        navigateHome();

        async function performMutation(email: string, password: string, userToken: string | null) {
            // signup the user and login the user
            const data = await GQLMutate(`
                mutation {
                    signinUser(email: {
                        email: "${email}"
                        password: "${password}"
                    }) {
                        token
                    }
                }
            `, userToken, (error: any) => {
                console.log(error);
            });
            return data;
        }
        async function readEmail(email: string, password: string, userToken: string | null) {
            // signup the user and login the user
            console.log('token', userToken)
            const data = await GQLQuery(`
              query {
                User(email:"${email}") {
                    id
                    email
                }
              }
            `, userToken, (key: string, value: any) => {
            }, (error: any) => {
                alert(error);
            });
            return data;
        }
        function navigateHome() {
            window.history.pushState({}, '', '/');
            window.dispatchEvent(new CustomEvent('location-changed'));
        }

        function setUserInRedux(user: User): SetPropertyAction {
            return {
                type: 'SET_PROPERTY',
                key: 'user',
                value: user
            };
        }
    }

    stateChange(e: CustomEvent) {
        const state: State = e.detail.state;

        this.userToken = state.userToken;
        this.user = state.user;
    }
}

window.customElements.define(PrendusLogin.is, PrendusLogin);
