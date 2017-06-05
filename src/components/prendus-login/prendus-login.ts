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
        this.action = persistUserToken(data.signinUser.token);
        this.action = setUserInRedux(data.signinUser.user);
        if (data.signinUser.token === this.userToken && (this.user && this.user.id === data.signinUser.user.id)) alert('user logged in successfully');
        navigateHome();

        async function performMutation(email: string, password: string, userToken: string | null) {
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
            `, userToken, (error: any) => {
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
