import {ContainerElement} from '../../typings/container-element';
import {State} from '../../typings/state';
import {GQLQuery, GQLMutate, GQLSubscribe} from '../../services/graphql-service';
import {SetPropertyAction} from '../../typings/actions';
import {User} from '../../typings/user';

class PrendusLogin extends Polymer.Element implements ContainerElement {
    componentId: string;
    action: SetPropertyAction;
    userToken: string;
    user: User;

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
        const data = await performMutation(email, password);
        setUserTokenInRedux(this, data.signinUser.token);
        setUserInRedux(this, data.signinUser.user);
        if (data.signinUser.token === this.userToken && this.user.id === data.signinUser.user.id) alert('user logged in successfully');
        navigateHome();

        async function performMutation(email, password) {
            // signup the user and login the user
            const data = await GQLMutate(`
                mutation {
                    signinUser(email: {
                        email: "${email}"
                        password: "${password}"
                    }) {
                        user {
                            id
                            email
                        }
                        token
                    }
                }
            `);

            return data;
        }

        function navigateHome() {
            window.history.pushState({}, null, '/');
            window.dispatchEvent(new CustomEvent('location-changed'));
        }

        function setUserTokenInRedux(component, token) {
            component.action = {
                type: 'SET_PROPERTY',
                key: 'userToken',
                value: token
            };
        }

        function setUserInRedux(component, user) {
            component.action = {
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

        console.log(state);
    }
}

window.customElements.define(PrendusLogin.is, PrendusLogin);
