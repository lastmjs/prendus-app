import {ContainerElement} from '../../typings/container-element';
import {State} from '../../typings/state';
import {GQLRequest, GQLSubscribe} from '../../node_modules/prendus-shared/services/graphql-service';
import {SetPropertyAction, DefaultAction, SetComponentPropertyAction} from '../../typings/actions';
import {persistUserToken, getAndSetUser, setNotification} from '../../redux/actions';
import {createUUID, navigate, getCookie, deleteCookie} from '../../node_modules/prendus-shared/services/utilities-service';
import {EMAIL_REGEX, NotificationType} from '../../services/constants-service';

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
    hardValidateEmail(): void {
      const emailElement: any = this.shadowRoot.querySelector('#email');
      emailElement.validate();
    }

    softValidateEmail(): void {
      const emailElement: any = this.shadowRoot.querySelector('#email');
      if(this.email.match(EMAIL_REGEX) !== null) emailElement.invalid = false;
    }
    hardValidatePassword(): void {
      const passwordElement: any = this.shadowRoot.querySelector('#password');
      passwordElement.validate();
    }

    softValidatePassword(): void {

      const passwordElement: any = this.shadowRoot.querySelector('#password');
      if(this.password.length >= 6) passwordElement.invalid = false;
    }

    hardValidateConfirmPassword(): void {
      const confirmPasswordElement: any = this.shadowRoot.querySelector('#confirm-password');
      if(this.password !== this.confirmPassword) confirmPasswordElement.invalid = true;
    }

    softValidateConfirmPassword(): void {
      const confirmPasswordElement: any = this.shadowRoot.querySelector('#confirm-password');
      if(this.password === this.confirmPassword) confirmPasswordElement.invalid = false;
    }

    enableSignup(userType: string, email: string, password: string, confirmPassword: string): boolean {
      return	userType !== ''
          &&	email.match(EMAIL_REGEX) !== null
          &&	password !== ''
          &&	confirmPassword !== ''
          &&	password === confirmPassword;
    }

    createUserOnEnter(e: any): void {
      if(e.keyCode === 13 && this.enableSignup(this.userType, this.email, this.password, this.confirmPassword)) this.createUser(e);
    }

    async signupClick() {
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: false
        };

        const that = this;
        const email: string = this.shadowRoot.querySelector('#email').value;
        const password: string = this.shadowRoot.querySelector('#password').value;
        const signupData = await performSignupMutation(email, password, this.userToken);
        // deleteCookie('ltiJWT');
        // if (this.ltiUserId) await performLTIUserLinkMutation(this.ltiUserId, signupData.createUser.id, this.userToken);
        const loginData = await performLoginMutation(email, password, this.userToken);
        this.action = persistUserToken(loginData.signinUser.token);
        this.action = await getAndSetUser(this.userToken);
        navigate(this.redirectUrl || getCookie('redirectUrl') ? decodeURIComponent(getCookie('redirectUrl')) : false || '/');
        deleteCookie('redirectUrl');

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: true
        };

        async function performSignupMutation(email: string, password: string, userToken: string | null) {
            // signup the user and login the user
            const data = await GQLRequest(`
                mutation signup($email: String!, $password: String!, $ltiJWT: String!) {
                    createUser(
                            authProvider: {
                                email: {
                                    email: $email
                                    password: $password
                                }
                            }
                            ltiJWT: $ltiJWT
                        ) {
                            id
                        }
                }
            `, {email, password, ltiJWT: getCookie('ltiJWT')}, userToken, (error: any) => {
                that.action = setNotification(error.message, NotificationType.ERROR)
            });

            return data;
        }

        async function performLoginMutation(email: string, password: string, userToken: string | null) {
            const data = await GQLRequest(`
                mutation signin($email: String!, $password: String!) {
                    signinUser(email: {
                        email: $email
                        password: $password
                    }) {
                        token
                    }
                }
            `, {email, password}, userToken, (error: any) => {
                that.action = setNotification(error.message, NotificationType.ERROR)
            });

            return data;
        }
    }

    stateChange(e: CustomEvent) {
        const state: State = e.detail.state;

        if (Object.keys(state.components[this.componentId] || {}).includes('loaded')) this.loaded = state.components[this.componentId].loaded;
        this.userToken = state.userToken;
    }
}

window.customElements.define(PrendusSignup.is, PrendusSignup);
