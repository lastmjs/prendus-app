import {ContainerElement} from '../../typings/container-element';
import {State} from '../../typings/state';
import {GQLQuery, GQLMutate, GQLSubscribe} from '../../services/graphql-service';
import {SetPropertyAction} from '../../typings/actions';

class PrendusSignup extends Polymer.Element implements ContainerElement {
    componentId: string;
    action: SetPropertyAction;

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
        const data = await performMutation(email, password);
        setUserTokenInRedux(this, data.signinUser.token);
        if (data.createUser.id) alert('user created successfully');
        navigateHome();

        function checkPasswords(password1, password2) {
            if (password === repeatPassword) {
                return true;
            }
            else {
                return false;
            }
        }

        async function performMutation(email, password) {
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
    }

    stateChange(e: CustomEvent) {
        const state: State = e.detail.state;
    }
}

window.customElements.define(PrendusSignup.is, PrendusSignup);
