import {ContainerElement} from '../../typings/container-element';
import {State} from '../../typings/state';
import {GQLRequest, GQLSubscribe} from '../../node_modules/prendus-shared/services/graphql-service';
import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {User} from '../../typings/user';
import {persistUserToken, setNotification} from '../../redux/actions';
import {navigate, createUUID, getCookie, deleteCookie, fireLocalAction} from '../../node_modules/prendus-shared/services/utilities-service';
import {EMAIL_REGEX, NotificationType} from '../../services/constants-service';

class PrendusLogin extends Polymer.Element implements ContainerElement {
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction;
    userToken: string | null;
    user: User | null;
    linkLtiAccount: boolean;
    loaded: boolean;
    redirectUrl: string;
    resetPasswordDialogOpen: boolean;
    emailElementInvalid: boolean;
    submitPasswordDisabled: boolean;

    static get is() { return 'prendus-login'; }
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
        this.action = fireLocalAction(this.componentId, 'loaded', true)
        this.action = fireLocalAction(this.componentId, 'resetPasswordDialogOpen', false)
        this.action = fireLocalAction(this.componentId, 'submitPasswordDisabled', true);
    }

    hardValidateEmail(): void {
  		const emailElement: any = this.shadowRoot.querySelector('#email');
  		emailElement.validate();
  	}

  	softValidateEmail(): void {
  		const emailElement: any = this.shadowRoot.querySelector('#email');
  		if(this.email.match(EMAIL_REGEX) !== null) emailElement.invalid = false; //TODO data binding with redux
  	}

    //TODO add loading indication to user
  	loginOnEnter(e: any) {
  		if(e.keyCode === 13 && this.enableLogIn(this.shadowRoot.querySelector('#email').value, this.shadowRoot.querySelector('#password').value)) this.loginClick();
  	}
    enableLogIn(email: string, password: string){
      if(email && password){
        return 	email.match(EMAIL_REGEX) !== null && password.length >= 6;
      }
    }
  	openResetPasswordDialog(): void {
      this.action = fireLocalAction(this.componentId, 'resetPasswordDialogOpen', true);
  	}
    closeResetPasswordDialog(): void {
      this.action = fireLocalAction(this.componentId, 'resetPasswordDialogOpen', false);
  	}
  	enableResetPassword(resetPasswordEmail: string): boolean {
  		return resetPasswordEmail ? resetPasswordEmail.match(EMAIL_REGEX) !== null : false;
  	}

  	async checkPasswordResetAndSubmitIfEnter(e: any): void {
      const email = this.shadowRoot.querySelector('#reset-password-email').value;
      if (this.enableResetPassword(email)) {
        this.action = fireLocalAction(this.componentId, 'submitPasswordDisabled', false);
    		if(e.keyCode === 13) { //TODO check first
          this.resetPassword();
      	};
      }else{
        this.action = fireLocalAction(this.componentId, 'submitPasswordDisabled', true);
      }
    }
    async resetPassword() {
      const email = this.shadowRoot.querySelector('#reset-password-email').value;
      this.shadowRoot.querySelector('#reset-password-email').value = ''; //TODO data binding
      this.action = fireLocalAction(this.componentId, 'loaded', false);
      await GQLRequest(`
          mutation($email: String!) {
              requestPasswordReset(email: $email) {
                  email
              }
          }
      `, {
          email
      }, this.userToken, (error: any) => {});
      this.action = fireLocalAction(this.componentId, 'loaded', true);
      this.closeResetPasswordDialog();
      //Eventually redirect to another landing page that says they will get an email if the
      this.action = setNotification("If the email entered exists you will receive instructions on how to reset your password", NotificationType.SUCCESS);
    }

    async loginClick() {
        //need to scope this so that we can access it to log errors
        const that = this; //TODO that = this should never happen
        const email: string = this.shadowRoot.querySelector('#email').value;
        const password: string = this.shadowRoot.querySelector('#password').value;
        const data = await _signinUser(email, password, this.userToken);
        if(!data){
          return;
        }
        const gqlUser = await _getUser(email, password, data.authenticateUser.token)
        const coursesRedux = `coursesFromUser${gqlUser.User.id}`;
        const ownedCourses = gqlUser.User.ownedCourses;
        this.action = {
            type: 'SET_PROPERTY',
            key: coursesRedux,
            value: ownedCourses
        };
        this.action = persistUserToken(data.authenticateUser.token);
        this.action = {
          type: 'SET_PROPERTY',
          key: 'user',
          value: gqlUser.User
        };
        const ltiJWT = getCookie('ltiJWT');
        deleteCookie('ltiJWT');
        _addLTIUser(ltiJWT);
        navigate(this.redirectUrl || getCookie('redirectUrl') ? decodeURIComponent(getCookie('redirectUrl')) : false || '/courses');

        if (getCookie('redirectUrl')) {
            deleteCookie('redirectUrl');
            //TODO horrible hack until assignments reload with properties correctly, not sure why they aren't
            window.location.reload();
        }
    }
    stateChange(e: CustomEvent) {
        const state: State = e.detail.state;
        const componentState = state.components[this.componentId] || {};
        const keys = Object.keys(componentState);
        if (keys.includes('loaded')) this.loaded = componentState.loaded;
        if (keys.includes('resetPasswordDialogOpen')) this.resetPasswordDialogOpen = componentState.resetPasswordDialogOpen;
        if (keys.includes('emailElementInvalid')) this.emailElementInvalid = componentState.emailElementInvalid;
        if (keys.includes('submitPasswordDisabled')) this.submitPasswordDisabled = componentState.submitPasswordDisabled;
        this.userToken = state.userToken;
        this.user = state.user;
    }
}

window.customElements.define(PrendusLogin.is, PrendusLogin);

async function _getUser(email: string, password: string, userToken: string | null) {
    const data = await GQLRequest(`
      query user($email: String!) {
        User(email:$email) {
            id
            email
            ownedCourses{
              id
              title
            }
        }
      }
    `, {email}, userToken, (error: any) => {
      this.action = setNotification(error.message, NotificationType.ERROR)
    });
    return data;
}

async function _addLTIUser(ltiJWT: string){
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
}
async function _signinUser(email: string, password: string, userToken: string | null) {
    // signup the user and login the user
    const data = await GQLRequest(`
        mutation authenticateUser($email: String!, $password: String!) {
            authenticateUser(email: $email, password: $password) {
                token
            }
        }
    `, {email, password}, userToken, (error: any) => {
      this.action = setNotification(error.message, NotificationType.ERROR)
    });
    return data;
}
