import {ContainerElement} from '../../typings/container-element';
import {State} from '../../typings/state';
import {GQLQuery, GQLMutate, GQLSubscribe} from '../../services/graphql-service';
import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {User} from '../../typings/user';
import {persistUserToken} from '../../redux/actions';
import {createUUID} from '../../services/utilities-service';
import {ConstantsService} from '../../services/constants-service';

class PrendusLogin extends Polymer.Element implements ContainerElement {
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction;
    userToken: string | null;
    user: User | null;
    linkLtiAccount: boolean;
    loaded: boolean;

    static get is() { return 'prendus-login'; }
    static get properties() {
        return {
            redirectUrl: {
                type: String
            },
            linkLtiAccount: {
                type: Boolean
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
  		const emailElement: any = this.querySelector('#email');
  		emailElement.validate();
  	}

  	softValidateEmail(): void {
  		const emailElement: any = this.querySelector('#email');
  		if(this.email.match(ConstantsService.EMAIL_REGEX) !== null) emailElement.invalid = false;
  	}

  	enableLogIn(email: string, password: string): boolean {
  		return 	email.match(ConstantsService.EMAIL_REGEX) !== null
  				&&	password.length >= 6;
  	}

  	loginOnEnter(e: any) {
  		if(e.keyCode === 13 && this.enableLogIn(this.email, this.password)) this.login();
  	}
      //Implement these once GraphCool has feature to reset password.
    	// openResetPasswordDialog(): void {
    	// 	this.querySelector('#reset-password-dialog').open()
    	// }
      //
    	// enableResetPassword(resetPasswordEmail: string): boolean {
    	// 	return resetPasswordEmail.match(ConstantsService.EMAIL_REGEX) !== null;
    	// }
      //
    	// resetPasswordOnEnter(e: any): void {
    	// 	if(e.keyCode === 13) {
    	// 		if(this.enableResetPassword(this.resetPasswordEmail)) this.sendResetEmail(e);
    	// 		else e.preventDefault();
    	// 	}
    	// }
    async loginClick() {
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: false
        };

        const email: string = this.shadowRoot.querySelector('#email').value;
        const password: string = this.shadowRoot.querySelector('#password').value;
        const data = await signinUser(email, password, this.userToken);
        const gqlUser = await getUser(email, password, data.signinUser.token)
        this.action = persistUserToken(data.signinUser.token);
        this.action = setUserInRedux(gqlUser.User);
        if (this.linkLtiAccount) await addLtiJwtToUser(this.user, this.userToken);
        navigateHome();

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: true
        };

        async function signinUser(email: string, password: string, userToken: string | null) {
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

        async function addLtiJwtToUser(user: User | null, userToken: string | null) {
            const data = await GQLMutate(`
                mutation {
                    updateUser(
                        id: "${user ? user.id : null}"
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

        async function getUser(email: string, password: string, userToken: string | null) {
            // signup the user and login the user
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

        if (Object.keys(state.components[this.componentId] || {}).includes('loaded')) this.loaded = state.components[this.componentId].loaded;
        this.userToken = state.userToken;
        this.user = state.user;
    }
}

window.customElements.define(PrendusLogin.is, PrendusLogin);

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
