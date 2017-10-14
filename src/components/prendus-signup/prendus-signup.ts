import {ContainerElement} from '../../typings/container-element';
import {State} from '../../typings/state';
import {User} from '../../typings/user';
import {GQLRequest, GQLSubscribe} from '../../node_modules/prendus-shared/services/graphql-service';
import {SetPropertyAction, DefaultAction, SetComponentPropertyAction} from '../../typings/actions';
import {persistUserToken, getAndSetUser, setNotification} from '../../redux/actions';
import {createUUID, navigate, getCookie, deleteCookie, fireLocalAction} from '../../node_modules/prendus-shared/services/utilities-service';
import {EMAIL_REGEX, NotificationType} from '../../services/constants-service';

class PrendusSignup extends Polymer.Element implements ContainerElement {
    componentId: string;
    action: SetPropertyAction | DefaultAction | SetComponentPropertyAction;
    userToken: string | null;
    redirectUrl: string;
    loaded: boolean;
    password: string;
    email: string;
    confirmedPassword: string;
    signupButtonEnabled: boolean;
    user: User | null;

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

    connectedCallback() {
        super.connectedCallback();
        this.action = fireLocalAction(this.componentId, "loaded", true)
        this.action = fireLocalAction(this.componentId, "signupButtonEnabled", false)
    }

    validateEmail(): void {
      const emailElement: string = this.shadowRoot.querySelector('#email').value;
      if(emailElement.match(EMAIL_REGEX) !== null) this.action = fireLocalAction(this.componentId, "email", emailElement);
      this.action = fireLocalAction(this.componentId, "signupButtonEnabled", enableSignup(emailElement, this.password, this.confirmedPassword))
    }
    hardValidateEmail(): void {
      this.shadowRoot.querySelector('#email').validate();
    }
    validatePassword(): void {
      const pass: string = this.shadowRoot.querySelector('#password').value;
      if(pass && pass.length >= 6) this.action = fireLocalAction(this.componentId, "password", pass)
      this.action = fireLocalAction(this.componentId, "signupButtonEnabled", enableSignup(this.email, pass, this.confirmedPassword))
    }
    hardValidatePassword(): void {
      this.shadowRoot.querySelector('#password').validate();
    }
    validateConfirmedPassword(): void {
      const confirmedPass: string = this.shadowRoot.querySelector('#confirm-password').value;
      if(confirmedPass && confirmedPass.length >=6) this.action = fireLocalAction(this.componentId, "confirmedPassword", confirmedPass)
      this.action = fireLocalAction(this.componentId, "signupButtonEnabled", enableSignup(this.email, this.password, confirmedPass))
    }
    hardValidateConfirmedPassword(): void {
      this.shadowRoot.querySelector('#confirm-password').validate();
    }
    createUserOnEnter(e: any): void {
      if(e.keyCode === 13 && enableSignup(this.email, this.password, this.confirmedPassword)) this.signupClick();
    }

    async signupClick() {
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: false
        };

        const email: string = this.shadowRoot.querySelector('#email').value;
        const password: string = this.shadowRoot.querySelector('#password').value;
        const signupData = await performSignupMutation(this, email, password, this.userToken);
        this.action = persistUserToken(signupData.signupUser.token);
        this.action = await getAndSetUser();

        const ltiJWT = getCookie('ltiJWT');
        deleteCookie('ltiJWT');

        if (ltiJWT) {
            await GQLRequest(`
                mutation addLTIUser($userId: ID!, $jwt: String!) {
                    addLTIUser(userId: $userId, jwt: $jwt) {
                        id
                    }
                }
            `, {
                userId: this.user ? this.user.id : 'user is null',
                jwt: ltiJWT
            }, this.userToken, (error: any) => {
                this.action = setNotification(error.message, NotificationType.ERROR);
            });
        }

        navigate(this.redirectUrl || getCookie('redirectUrl') ? decodeURIComponent(getCookie('redirectUrl')) : false || '/');
        deleteCookie('redirectUrl');

        fireLocalAction(this.componentId, 'loaded', true)

        async function performSignupMutation(context: PrendusSignup, email: string, password: string, userToken: string | null) {
            // signup the user and login the user
            const data = await GQLRequest(`
                mutation signupUser($email: String!, $password: String!) {
                    signupUser(email: $email, password: $password) {
                        id
                        token
                    }
                }
            `, {email, password}, userToken, (error: any) => {
                context.action = setNotification(error.message, NotificationType.ERROR)
            });

            return data;
        }
    }

    stateChange(e: CustomEvent) {
        const state: State = e.detail.state;
        const componentState = state.components[this.componentId] || {};
        const keys = Object.keys(componentState);
        if (keys.includes('loaded')) this.loaded = componentState.loaded;
        if (keys.includes('email')) this.email = componentState.email;
        if (keys.includes('password')) this.password = componentState.password;
        if (keys.includes('confirmedPassword')) this.confirmedPassword = componentState.confirmedPassword;
        if (keys.includes('signupButtonEnabled')) this.signupButtonEnabled = componentState.signupButtonEnabled;
        this.user = state.user;
        this.userToken = state.userToken;
    }
}

window.customElements.define(PrendusSignup.is, PrendusSignup);

function enableSignup(email: string, password: string, confirmedPassword: string){
  return	email.match(EMAIL_REGEX) !== null
      &&	password.length >= 6
      &&	confirmedPassword.length >= 6
      &&	password === confirmedPassword;
}
