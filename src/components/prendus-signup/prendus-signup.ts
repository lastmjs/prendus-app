import {ContainerElement} from '../../typings/container-element';
import {State} from '../../typings/state';
import {GQLQuery, GQLMutate, GQLSubscribe} from '../../services/graphql-service';
import {SetPropertyAction, DefaultAction, SetComponentPropertyAction} from '../../typings/actions';
import {persistUserToken, getAndSetUser} from '../../redux/actions';
import {createUUID, navigate} from '../../services/utilities-service';
import {ConstantsService} from '../../services/constants-service';

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
      if(this.email.match(ConstantsService.EMAIL_REGEX) !== null) emailElement.invalid = false;
    }
    hardValidatePassword(): void {
      const passwordElement: any = this.shadowRoot.querySelector('#password');
      passwordElement.validate();
    }

    softValidatePassword(): void {
      console.log('soft validate ')

      const passwordElement: any = this.shadowRoot.querySelector('#password');
      if(this.password.length >= 6) passwordElement.invalid = false;
    }

    hardValidateConfirmPassword(): void {
      const confirmPasswordElement: any = this.shadowRoot.querySelector('#confirm-password');
      if(this.password !== this.confirmPassword) confirmPasswordElement.invalid = true;
    }

    softValidateConfirmPassword(): void {
      console.log('soft validate confirm')
      const confirmPasswordElement: any = this.shadowRoot.querySelector('#confirm-password');
      if(this.password === this.confirmPassword) confirmPasswordElement.invalid = false;
    }

    enableSignup(userType: string, email: string, password: string, confirmPassword: string): boolean {
      return	userType !== ''
          &&	email.match(ConstantsService.EMAIL_REGEX) !== null
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

        const email: string = this.shadowRoot.querySelector('#email').value;
        const password: string = this.shadowRoot.querySelector('#password').value;
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
        navigate(`/`)
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
