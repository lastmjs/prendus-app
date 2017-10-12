import {ContainerElement} from '../../typings/container-element';
import {State} from '../../typings/state';
import {GQLRequest, GQLSubscribe} from '../../node_modules/prendus-shared/services/graphql-service';
import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {User} from '../../typings/user';
import {persistUserToken, setNotification} from '../../redux/actions';
import {navigate, createUUID, getCookie, deleteCookie} from '../../node_modules/prendus-shared/services/utilities-service';
import {EMAIL_REGEX, NotificationType} from '../../services/constants-service';

class PrendusLogin extends Polymer.Element implements ContainerElement {
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction;
    userToken: string | null;
    user: User | null;
    linkLtiAccount: boolean;
    loaded: boolean;
    redirectUrl: string;

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
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: true
        };
    }
    hardValidateEmail(): void {
  		const emailElement: any = this.shadowRoot.querySelector('#email');
  		emailElement.validate();
  	}

  	softValidateEmail(): void {
  		const emailElement: any = this.shadowRoot.querySelector('#email');
  		if(this.email.match(EMAIL_REGEX) !== null) emailElement.invalid = false;
  	}

  	enableLogIn(email: string, password: string){
      if(email && password){
        return 	email.match(EMAIL_REGEX) !== null
            &&	password.length >= 6;
      }
  	}

  	loginOnEnter(e: any) {
  		if(e.keyCode === 13 && this.enableLogIn(this.shadowRoot.querySelector('#email').value, this.shadowRoot.querySelector('#password').value)) this.loginClick();
  	}

    	openResetPasswordDialog(): void {
    		this.shadowRoot.querySelector('#reset-password-dialog').open();
    	}

    	enableResetPassword(resetPasswordEmail: string): boolean {
    		return resetPasswordEmail.match(EMAIL_REGEX) !== null;
    	}

    	async resetPasswordOnEnter(e: any): void {
    		if(e.keyCode === 13) {
                const email = this.shadowRoot.querySelector('#reset-password-email').value;
    			if (this.enableResetPassword(email)) {
                    await GQLRequest(`
                        mutation($email: String!) {
                            requestPasswordReset(email: $email) {
                                email
                            }
                        }
                    `, {
                        email
                    }, this.userToken, (error: any) => {
                        this.action = setNotification(error.message, NotificationType.ERROR);
                    });

                    this.shadowRoot.querySelector('#reset-password-email').value = '';
                    this.shadowRoot.querySelector('#reset-password-dialog').close();
                }
    		}
    	}

    async loginClick() {
        //need to scope this so that we can access it to log errors
        const that = this; //TODO that = this should never happen
        const email: string = this.shadowRoot.querySelector('#email').value;
        const password: string = this.shadowRoot.querySelector('#password').value;
        const data = await signinUser(email, password, this.userToken);
        if(data){
          const gqlUser = await getUser(email, password, data.authenticateUser.token)
          const coursesRedux = `coursesFromUser${gqlUser.User.id}`;
          const ownedCourses = gqlUser.User.ownedCourses;
          this.action = {
              type: 'SET_PROPERTY',
              key: coursesRedux,
              value: ownedCourses
          };
          this.action = persistUserToken(data.authenticateUser.token);
          this.action = setUserInRedux(gqlUser.User);

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

          navigate(this.redirectUrl || getCookie('redirectUrl') ? decodeURIComponent(getCookie('redirectUrl')) : false || '/courses');

          if (getCookie('redirectUrl')) {
              deleteCookie('redirectUrl');
              //TODO horrible hack until assignments reload with properties correctly, not sure why they aren't
              window.location.reload();
          }
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
              that.action = setNotification(error.message, NotificationType.ERROR)
            });
            return data;
        }

        async function getUser(email: string, password: string, userToken: string | null) {
            // signup the user and login the user
            const that = this;
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
              that.action = setNotification(error.message, NotificationType.ERROR)
            });
            return data;
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
