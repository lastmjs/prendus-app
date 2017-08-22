import {ContainerElement} from '../../typings/container-element';
import {State} from '../../typings/state';
import {GQLQuery, GQLMutate, GQLSubscribe} from '../../services/graphql-service';
import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {User} from '../../typings/user';
import {persistUserToken, setNotification} from '../../redux/actions';
import {navigate, createUUID, getCookie, deleteCookie} from '../../services/utilities-service';
import {EMAIL_REGEX} from '../../services/constants-service';

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
      //Implement these once GraphCool has feature to reset password.
    	// openResetPasswordDialog(): void {
    	// 	this.shadowRoot.querySelector('#reset-password-dialog').open()
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
        //need to scope this so that we can access it to log errors
        const that = this;
        const email: string = this.shadowRoot.querySelector('#email').value;
        const password: string = this.shadowRoot.querySelector('#password').value;
        const data = await signinUser(email, password, this.userToken);
        if(data){
          const gqlUser = await getUser(email, password, data.signinUser.token)
          const coursesRedux = `coursesFromUser${gqlUser.User.id}`;
          const ownedCourses = gqlUser.User.ownedCourses;
          this.action = {
              type: 'SET_PROPERTY',
              key: coursesRedux,
              value: ownedCourses
          };
          this.action = persistUserToken(data.signinUser.token);
          this.action = setUserInRedux(gqlUser.User);
          await addLtiJwtToUser(this.user, this.userToken); //TODO this will run every time the user logs in, even if they aren't linking their account. This is a waste of resources, but it is simple. It allows us to get rid of the linkLTIAccount query param
          navigate(this.redirectUrl || getCookie('redirectUrl') ? decodeURIComponent(getCookie('redirectUrl')) : false || '/courses');
          deleteCookie('redirectUrl');
        }
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
              that.action = setNotification(error.message, "error")
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
              that.action = setNotification(error.message, "error")
            });
            return data;
        }

        async function getUser(email: string, password: string, userToken: string | null) {
            // signup the user and login the user
            const that = this;
            const data = await GQLQuery(`
              query {
                User(email:"${email}") {
                    id
                    email
                    ownedCourses{
                      id
                      title
                    }
                }
              }
            `, userToken, (key: string, value: any) => {
            }, (error: any) => {
            that.action = setNotification(error.message, "error")
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
