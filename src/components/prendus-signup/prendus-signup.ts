import {ContainerElement} from '../../typings/container-element';
import {State} from '../../typings/state';
import {GQLQuery, GQLMutate, GQLSubscribe} from '../../services/graphql-service';
import {SetPropertyAction, DefaultAction, SetComponentPropertyAction} from '../../typings/actions';
import {persistUserToken, getAndSetUser} from '../../redux/actions';
import {createUUID} from '../../services/utilities-service';

class PrendusSignup extends Polymer.Element implements ContainerElement {
    componentId: string;
    action: SetPropertyAction | DefaultAction | SetComponentPropertyAction;
    userToken: string | null;
    redirectUrl: string;
    loaded: boolean;

    static get is() { return 'prendus-signup'; }
    static get properties() {
        return {
            redirectUrl: {
                type: String
            }
        };
    }

    constructor() {
        super();

        this.componentId = createUUID();
    }

    async connectedCallback() {
        super.connectedCallback();

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: true
        };
    }

    loadData() {

    }

    subscribeToData() {

    }

    async signupClick() {
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: false
        };

        const email: string = this.shadowRoot.querySelector('#emailInput').value;
        const password: string = this.shadowRoot.querySelector('#passwordInput').value;
        const repeatPassword: string = this.shadowRoot.querySelector('#repeatPasswordInput').value;
        const passwordsMatch = checkPasswords(password, repeatPassword);
        if (!passwordsMatch) {
            alert('passwords must match');

            this.action = {
                type: 'SET_COMPONENT_PROPERTY',
                componentId: this.componentId,
                key: 'loaded',
                value: true
            };

            return;
        }
        const signupData = await performSignupMutation(email, password, this.userToken);
        // deleteCookie('ltiJWT');
        // if (this.ltiUserId) await performLTIUserLinkMutation(this.ltiUserId, signupData.createUser.id, this.userToken);
        const loginData = await performLoginMutation(email, password, this.userToken);
        this.action = persistUserToken(loginData.signinUser.token);
        this.action = await getAndSetUser(this.userToken);
        navigate(this.redirectUrl);

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: true
        };

        function checkPasswords(password1: string, password2: string) {
            if (password === repeatPassword) {
                return true;
            }
            else {
                return false;
            }
        }

        async function performSignupMutation(email: string, password: string, userToken: string | null) {
            // signup the user and login the user
            const data = await GQLMutate(`
                mutation {
                    createUser(
                            authProvider: {
                                email: {
                                    email: "${email}"
                                    password: "${password}"
                                }
                            }
                            ltiJWT: "${getCookie('ltiJWT')}"
                        ) {
                            id
                        }
                }
            `, userToken, (error: any) => {
                console.log(error);
            });

            return data;
        }

        // async function performLTIUserLinkMutation(ltiUserId: string, userId: string, userToken: string | null) {
        //     //TODO use a create or update if possible
        //     const data = await GQLMutate(`
        //         mutation {
        //             createLTIUser(
        //                 ltiUserId: "${ltiUserId}"
        //                 userId: "${userId}"
        //             ) {
        //                 id
        //             }
        //         }
        //     `, userToken, (error: any) => {
        //         console.log(error);
        //     });
        //
        //     return data;
        // }

        async function performLoginMutation(email: string, password: string, userToken: string | null) {
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

        function navigate(redirectUrl) {
            window.history.pushState({}, '', redirectUrl || '/');
            window.dispatchEvent(new CustomEvent('location-changed'));
        }
    }

    stateChange(e: CustomEvent) {
        const state: State = e.detail.state;

        if (Object.keys(state.components[this.componentId] || {}).includes('loaded')) this.loaded = state.components[this.componentId].loaded;
        this.userToken = state.userToken;
    }
}

window.customElements.define(PrendusSignup.is, PrendusSignup);

//TODO put this into redux somehow. Manage all cookies from Redux. Also, use regex
function getCookie(name) {
    const cookiesObj = document.cookie.split(';').reduce((result, cookieString) => {
        const cookieArray = cookieString.split('=');
        const key = cookieArray[0];
        const value = cookieArray[1];
        return {
            ...result,
            [key]: value
        };
    }, {});
    return cookiesObj[name];
}

//TODO put this into redux somehow. Manage all cookies from Redux. Also, use regex
function deleteCookie(name) {
    console.log('document.cookie before', document.cookie);
    document.cookie = document.cookie.split(';').reduce((result, cookieString) => {
        const cookieArray = cookieString.split('=');
        const key = cookieArray[0];
        const value = cookieArray[1];

        console.log('key', key);
        console.log('name', name);

        if (key !== name) {
            console.log('i am here')
            return `${result};${key}${value}`;
        }
        else {
            console.log('i am not here')
            return result;
        }
    }, '');
    console.log('document.cookie after', document.cookie);
}
