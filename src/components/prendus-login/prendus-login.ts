import {GQLRequest, GQLSubscribe} from '../../node_modules/prendus-shared/services/graphql-service';
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
    loginDisabled: boolean;
    resetPasswordDialogOpen: boolean;
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
        this.action = fireLocalAction(this.componentId, 'loaded', true);
        this.action = fireLocalAction(this.componentId, 'loginDisabled', true);
        this.action = fireLocalAction(this.componentId, 'resetPasswordDialogOpen', false);
        this.action = fireLocalAction(this.componentId, 'submitPasswordDisabled', true);
    }

    hardValidateEmail(): void {
      //validate is a method on the polymer input component
  		const emailElement: any = this.shadowRoot.querySelector('#email');
  		emailElement.validate();
  	}
    hardValidatePassword(): void {
      //validate is a method on the polymer input component
  		const passwordElement: any = this.shadowRoot.querySelector('#password');
  		passwordElement.validate();
  	}
  	softValidate(): void {
      const emailElement: any = this.shadowRoot.querySelector('#email');
      const passwordElement: any = this.shadowRoot.querySelector('#password');
      this.action = fireLocalAction(this.componentId, 'loginDisabled', checkIfLoginButtonShouldBeDisabled(emailElement, passwordElement));
    }
    //TODO add loading indication to user
  	loginOnEnter(e: any) {
      const emailElement: any = this.shadowRoot.querySelector('#email');
      const passwordElement: any = this.shadowRoot.querySelector('#password');
  		if(e.keyCode === 13 && !checkIfLoginButtonShouldBeDisabled(emailElement, passwordElement)) this.loginClick();
    }
  	openResetPasswordDialog(): void {
      this.action = fireLocalAction(this.componentId, 'resetPasswordDialogOpen', true);
  	}
    closeResetPasswordDialog(): void {
      this.action = fireLocalAction(this.componentId, 'resetPasswordDialogOpen', false);
  	}

  	async checkPasswordResetAndSubmitIfEnter(e: any): void {
      const email = this.shadowRoot.querySelector('#reset-password-email').value;
      if (enableResetPassword(email)) {
        this.action = fireLocalAction(this.componentId, 'submitPasswordDisabled', false);
    		if(e.keyCode === 13) {
          this.resetPassword();
      	};
      }else{
        this.action = fireLocalAction(this.componentId, 'submitPasswordDisabled', true);
      }
    }
    async resetPassword() {
        this.action = fireLocalAction(this.componentId, 'loaded', false);
        await sendResetPasswordEmail(this.shadowRoot.querySelector('#reset-password-email').value);
        this.action = fireLocalAction(this.componentId, 'loaded', true);
        this.closeResetPasswordDialog();
        //Eventually redirect to another landing page that says they will get an email if the
        this.action = setNotification("If the email entered exists you will receive instructions on how to reset your password", NotificationType.SUCCESS);
    }

    async loginClick() {
        //need to scope this so that we can access it to log errors
        try{
          this.action = fireLocalAction(this.componentId, 'loaded', false);
          const email: string = this.shadowRoot.querySelector('#email').value;
          const password: string = this.shadowRoot.querySelector('#password').value;
          const data = await signinUser(email, password, this.userToken);
          if(!data.authenticateUser){
            this.action = fireLocalAction(this.componentId, 'loaded', true);
            return;
          }
          const gqlUser = await getUser(email, password, data.authenticateUser.token)
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
          await addLTIUser(ltiJWT, gqlUser.User, data.authenticateUser.token);
          navigate(this.redirectUrl || (getCookie('redirectUrl') ? decodeURIComponent(getCookie('redirectUrl')) : false || '/courses'));

          if (getCookie('redirectUrl')) {
              deleteCookie('redirectUrl');
              //TODO horrible hack until assignments reload with properties correctly, not sure why they aren't
              window.location.reload();
          }
          this.action = fireLocalAction(this.componentId, 'loaded', true);
        }catch(error){
          this.action = setNotification(error.message, NotificationType.ERROR)
          this.action = fireLocalAction(this.componentId, 'loaded', true);
        }
    }
    stateChange(e: CustomEvent) {
        const state: State = e.detail.state;
        const componentState = state.components[this.componentId] || {};
        const keys = Object.keys(componentState);
        if (keys.includes('loaded')) this.loaded = componentState.loaded;
        if (keys.includes('loginDisabled')) this.loginDisabled = componentState.loginDisabled;
        if (keys.includes('resetPasswordDialogOpen')) this.resetPasswordDialogOpen = componentState.resetPasswordDialogOpen;
        if (keys.includes('submitPasswordDisabled')) this.submitPasswordDisabled = componentState.submitPasswordDisabled;
        this.userToken = state.userToken;
        this.user = state.user;
    }
}

window.customElements.define(PrendusLogin.is, PrendusLogin);

function checkIfLoginButtonShouldBeDisabled(emailElement: any, passwordElement: any){
  return emailElement.value && passwordElement.value ? emailElement.value.match(EMAIL_REGEX) === null || passwordElement.value.length <= 6 : true;
}

function enableResetPassword(resetPasswordEmail: string): boolean {
  return resetPasswordEmail ? resetPasswordEmail.match(EMAIL_REGEX) !== null : false;
}

async function signinUser(email: string, password: string, userToken: string | null) {
    // signup the user and login the user
    const data = await GQLRequest(`
        mutation authenticateUser($email: String!, $password: String!) {
            authenticateUser(email: $email, password: $password) {
                token
            }
        }
    `, {email, password}, userToken, (error: any) => {
      const updatedError = {
        ...error,
        message: "Password or email information incorrect."
      }
      throw updatedError;
    });
    return data;
}

async function getUser(email: string, password: string, userToken: string | null) {
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
      const updatedError = {
        ...error,
        message: "Could not fetch user data."
      }
      throw updatedError;
    });
    return data;
}
//TODO put this in Prendus Shared. Used in the signup component too
async function addLTIUser(ltiJWT: string, user: User, userToken: string){
  if (ltiJWT) {
      await GQLRequest(`
          mutation addLTIUser($userId: ID!, $jwt: String!) {
              addLTIUser(userId: $userId, jwt: $jwt) {
                  id
              }
          }
      `, {
          userId: user ? user.id : 'user is null',
          jwt: ltiJWT
      }, userToken, (error: any) => {
        const updatedError = {
          ...error,
          message: "There was a problem adding the LTI token to your user account. Contact support@prendus.com for help."
        }
        throw updatedError;
      });
  }
}

async function sendResetPasswordEmail(email: string){
  await GQLRequest(`
      mutation($email: String!) {
          requestPasswordReset(email: $email) {
              email
          }
      }
  `, {
      email
  }, null, (error: any) => {}); //we don't want to show any error because they shouldn't know if an email doesn't exist. So we can't show any errors.
}
