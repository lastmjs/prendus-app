import {ContainerElement} from '../../typings/container-element';
import {State} from '../../typings/state';
import {GQLQuery, GQLMutate, GQLSubscribe} from '../../services/graphql-service';
import {SetPropertyAction, DefaultAction} from '../../typings/actions';
import {persistUserToken, getAndSetUser} from '../../redux/actions';

class PrendusSignup extends Polymer.Element implements ContainerElement {
    componentId: string;
    action: SetPropertyAction | DefaultAction;
    userToken: string | null;

    static get is() { return 'prendus-signup'; }

    async connectedCallback() {
        super.connectedCallback();

        this.componentId = this.shadowRoot.querySelector('#reduxStoreElement').elementId;
    }

    loadData() {

    }

    subscribeToData() {

    }

    async signupClick() {
        const email: string = this.shadowRoot.querySelector('#emailInput').value;
        const password: string = this.shadowRoot.querySelector('#passwordInput').value;
        const repeatPassword: string = this.shadowRoot.querySelector('#repeatPasswordInput').value;
        const passwordsMatch = checkPasswords(password, repeatPassword);
        if (!passwordsMatch) alert('passwords must match');
        const data = await performMutation(email, password, this.userToken);
        this.action = persistUserToken(data.signinUser.token);
        this.action = await getAndSetUser(this.userToken);
        if (data.createUser.id) alert('user created successfully');
        navigateHome();

        function checkPasswords(password1: string, password2: string) {
            if (password === repeatPassword) {
                return true;
            }
            else {
                return false;
            }
        }

        async function performMutation(email: string, password: string, userToken: string | null) {
            // signup the user and login the user
            const data = await GQLMutate(`
                mutation {
                    createUser(authProvider: {
                        email: {
                            email: "${email}"
                            password: "${password}"
                        }
                    }) {
                        id
                    }

                    signinUser(email: {
                        email: "${email}"
                        password: "${password}"
                    }) {
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
    }

    stateChange(e: CustomEvent) {
        const state: State = e.detail.state;

        this.userToken = state.userToken;
    }
}

window.customElements.define(PrendusSignup.is, PrendusSignup);
