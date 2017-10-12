//TODO this component, along with login, signup, and any other similar component must be cleaned up, abstracted, and made modular and code-reusable. It's very messy right now

import {GQLRequest} from '../../node_modules/prendus-shared/services/graphql-service';
import {fireLocalAction, navigate} from '../../node_modules/prendus-shared/services/utilities-service';
import {EMAIL_REGEX, NotificationType} from '../../services/constants-service';
import {setNotification} from '../../redux/actions';

class PrendusPasswordReset extends Polymer.Element {
    static get is() { return 'prendus-password-reset'; }
    static get properties() {
        return {
            jwt: {
                type: String
            }
        };
    }

    // validateEmail(): void {
    //   const emailElement: string = this.shadowRoot.querySelector('#email').value;
    //   if(emailElement.match(EMAIL_REGEX) !== null) this.action = fireLocalAction(this.componentId, "email", emailElement);
    //   this.action = fireLocalAction(this.componentId, "buttonEnabled", enableSignup(emailElement, this.password, this.confirmedPassword))
    // }
    // hardValidateEmail(): void {
    //   this.shadowRoot.querySelector('#email').validate();
    // }
    // validatePassword(): void {
    //   const pass: string = this.shadowRoot.querySelector('#password').value;
    //   if(pass && pass.length >= 6) this.action = fireLocalAction(this.componentId, "password", pass)
    //   this.action = fireLocalAction(this.componentId, "buttonEnabled", enableSignup(this.email, pass, this.confirmedPassword))
    // }
    // hardValidatePassword(): void {
    //   this.shadowRoot.querySelector('#password').validate();
    // }
    // validateConfirmedPassword(): void {
    //   const confirmedPass: string = this.shadowRoot.querySelector('#confirm-password').value;
    //   if(confirmedPass && confirmedPass.length >=6) this.action = fireLocalAction(this.componentId, "confirmedPassword", confirmedPass)
    //   this.action = fireLocalAction(this.componentId, "buttonEnabled", enableSignup(this.email, this.password, confirmedPass))
    // }
    // hardValidateConfirmedPassword(): void {
    //   this.shadowRoot.querySelector('#confirm-password').validate();
    // }

    async resetPasssword() {
        const email = this.shadowRoot.querySelector('#email').value;
        const password = this.shadowRoot.querySelector('#password').value;

        await GQLRequest(`
            mutation($email: String!, $newPassword: String!, $jwt: String!) {
                resetPassword(
                    email: $email
                    newPassword: $newPassword
                    jwt: $jwt
                ) {
                    id
                }
            }
        `, {
            email,
            newPassword: password,
            jwt: this.jwt
        }, this.userToken, (error: any) => {
            this.action = setNotification(error.message, NotificationType.ERROR);
        });

        navigate('/login');
    }

    stateChange(e: CustomEvent) {
        const state: State = e.detail.state;
        const componentState = state.components[this.componentId] || {};
        const keys = Object.keys(componentState);

        this.user = state.user;
        this.userToken = state.userToken;
    }
}

window.customElements.define(PrendusPasswordReset.is, PrendusPasswordReset);

function enableSignup(email: string, password: string, confirmedPassword: string){
  return	email.match(EMAIL_REGEX) !== null
      &&	password !== ''
      &&	confirmedPassword !== ''
      &&	password === confirmedPassword;
}
