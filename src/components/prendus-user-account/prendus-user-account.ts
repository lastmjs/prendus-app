import {ContainerElement} from '../../typings/container-element';
import {State} from '../../typings/state';
import {User} from '../../typings/user';
import {Institution} from '../../typings/institution';
import {GQLRequest, GQLSubscribe} from '../../node_modules/prendus-shared/services/graphql-service';
import {SetPropertyAction, DefaultAction, SetComponentPropertyAction} from '../../typings/actions';
import {persistUserToken, getAndSetUser, setNotification} from '../../redux/actions';
import {createUUID, navigate, getCookie, deleteCookie, fireLocalAction} from '../../node_modules/prendus-shared/services/utilities-service';
import {EMAIL_REGEX, NotificationType} from '../../services/constants-service';

class PrendusUserAccount extends Polymer.Element implements ContainerElement {
    componentId: string;
    action: SetPropertyAction | DefaultAction | SetComponentPropertyAction;
    userToken: string | null;
    redirectUrl: string;
    loaded: boolean;
    password: string;
    email: string;
    confirmedPassword: string;
    updateProfileButtonEnabled: boolean;
    user: User | null;
    client: any;
    index: any;
    institution: Institution;
    institutionPartialName: string;
    institutions: string[];
    attributesToRetrieve: string[]
    createInstitutionModalOpen: boolean;

    static get is() { return 'prendus-user-account'; }
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
        this.action = fireLocalAction(this.componentId, "createInstitutionModalOpen", false);
        this.action = fireLocalAction(this.componentId, "attributesToRetrieve", ['Name']);
        this.action = fireLocalAction(this.componentId, "loaded", true);
        this.action = fireLocalAction(this.componentId, "updateProfileButtonEnabled", false);
    }
    openCreateInstitutionModal(e: any){
      this.shadowRoot.querySelector('#create-institution-modal').open();
      // this.action = fireLocalAction(this.componentId, "createInstitutionModalOpen", true);
    }
    closeCreateInstitutionModal(){
      this.shadowRoot.querySelector('#create-institution-modal').close();
    }
    loadInstitutions(e: any){
      //This is so that the autocomplete will function correctly.
      const institutions = e.detail.results.map((result: Institution) => {
        return {
          id: "id",
          //change to result.name once Algolia is updated
          text: result.Name,
          value: result.Name
        }
      })
      this.action = fireLocalAction(this.componentId, "institutions", institutions)
    }
    findInstitution(){
      this.action = fireLocalAction(this.componentId, "institutionPartialName", this.shadowRoot.querySelector('#institution').value)
      // this.action = fireLocalAction(this.componentId, "institutionPartialName", this.shadowRoot.querySelector('#institution').shadowRoot.querySelector('#autocompleteInput').value)
      const institutionPartialName: string = this.shadowRoot.querySelector('#institution').value;
    }
    institutionAutoSelected(e: any){
      const institution = {
        id: e.detail.id,
        //needs to be updated when Algolia is fixed. Also add in other fields once Algolia is updated.
        name: e.detail.text,
        // country: e.detail.country,
        // state: e.detail.state,
        // city: e.detail.city
      }
      this.action = fireLocalAction(this.componentId, "institution", institution);
    }
    setInstitution(e: any){
      const institution = {
        id: e.detail.institution.id,
        text: e.detail.institution.name,
        value: e.detail.institution.name
      }
      this.action = fireLocalAction(this.componentId, "institution", e.detail.institution);
      this.closeCreateInstitutionModal();
    }
    validateEmail(): void {
      const emailElement: string = this.shadowRoot.querySelector('#email').value;
      if(emailElement && emailElement.match(EMAIL_REGEX) !== null) this.action = fireLocalAction(this.componentId, "email", emailElement);
      this.action = fireLocalAction(this.componentId, "updateProfileButtonEnabled", enableSignup(emailElement, this.password, this.confirmedPassword))
    }
    hardValidateEmail(): void {
      this.shadowRoot.querySelector('#email').validate();
    }
    validatePassword(): void {
      const pass: string = this.shadowRoot.querySelector('#password').value;
      if(pass && pass.length >= 6) this.action = fireLocalAction(this.componentId, "password", pass)
      this.action = fireLocalAction(this.componentId, "updateProfileButtonEnabled", enableSignup(this.email, pass, this.confirmedPassword))
    }
    hardValidatePassword(): void {
      this.shadowRoot.querySelector('#password').validate();
    }
    validateConfirmedPassword(): void {
      const confirmedPass: string = this.shadowRoot.querySelector('#confirm-password').value;
      if(confirmedPass && confirmedPass.length >=6) this.action = fireLocalAction(this.componentId, "confirmedPassword", confirmedPass);
      this.action = fireLocalAction(this.componentId, "signupButtonEnabled", enableSignup(this.email, this.password, confirmedPass));
    }
    hardValidateConfirmedPassword(): void {
      this.shadowRoot.querySelector('#confirm-password').validate();
    }
    createUserOnEnter(e: any): void {
      if(e.keyCode === 13 && enableSignup(this.email, this.password, this.confirmedPassword)) this.updateProfileClick();
    }

    async updateProfileClick() {
        try{
          this.action = fireLocalAction(this.componentId, "loaded", false)
          const email: string = this.shadowRoot.querySelector('#email').value === this.user.email ? this.user.email : this.shadowRoot.querySelector('#email').value;
          const password: string = this.shadowRoot.querySelector('#password').value;
          const updateData = password ? await performUpdateMutationWithPassword(this, email, password, this.userToken) : await performUpdateMutationWithoutPassword(this, email, password, this.userToken);
          if(this.institution && this.institution.id){
            await addUserInstitution(this, signupData.id, this.institution.id, this.userToken);
          }
          this.action = persistUserToken(signupData.signupUser.token);
          this.action = await getAndSetUser();
          const ltiJWT = getCookie('ltiJWT');
          deleteCookie('ltiJWT');
          if(ltiJWT) addLTIUser(this.user, ltiJWT, signupData.signupUser.token);
          navigate(this.redirectUrl || getCookie('redirectUrl') ? decodeURIComponent(getCookie('redirectUrl')) : false || '/');
          deleteCookie('redirectUrl');

          this.action = fireLocalAction(this.componentId, "loaded", true)
        }catch(error){
          console.log('error', error)
          this.action = setNotification(error.message, NotificationType.ERROR);
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
        if (keys.includes('updateProfileButtonEnabled')) this.updateProfileButtonEnabled = componentState.updateProfileEnabled;
        if (keys.includes('institution')) this.institution = componentState.institution;
        if (keys.includes('institutionPartialName')) this.institutionPartialName = componentState.institutionPartialName;
        if (keys.includes('institutions')) this.institutions = componentState.institutions;
        if (keys.includes('attributesToRetrieve')) this.attributesToRetrieve = componentState.attributesToRetrieve;
        if (keys.includes('createInstitutionModalOpen')) this.createInstitutionModalOpen = componentState.createInstitutionModalOpen;
        this.user = state.user;
        this.userToken = state.userToken;
    }
}

window.customElements.define(PrendusUserAccount.is, PrendusUserAccount);

function enableSignup(email: string, password: string, confirmedPassword: string){
  if(email && password && confirmedPassword){
    return	email.match(EMAIL_REGEX) !== null
        &&	password.length >= 6
        &&	confirmedPassword.length >= 6
        &&	password === confirmedPassword;
  }else{
    return false
  }
}

async function performUpdatateMutationWithPassword(context: PrendusUserAccount, email: string, password: string, userToken: string | null) {
    // signup the user and login the user
    const data = await GQLRequest(`
        mutation updateUser($email: String!, $password: String!) {
            updateUser(email: $email, password: $password) {
                id
                token
            }
        }
    `, {email, password}, userToken, (error: any) => {
        console.log('error in signup', error)
        context.action = setNotification(error.message, NotificationType.ERROR)
    });

    return data;
}
async function performUpdatateMutationWithoutPassword(context: PrendusUserAccount, email: string, userToken: string | null) {
    // signup the user and login the user
    const data = await GQLRequest(`
        mutation updateUser($email: String!, $password: String!) {
            updateUser(email: $email, password: $password) {
                id
                token
            }
        }
    `, {email, password}, userToken, (error: any) => {
        console.log('error in signup', error)
        context.action = setNotification(error.message, NotificationType.ERROR)
    });

    return data;
}
async function addUserInstitution(context: PrendusUserAccount, userId: string, institutionId: string, userToken: string | null){
  const data = await GQLRequest(`
      mutation addUserInstitution($email: String!, $password: String!) {
          addToUsersInstitution(usersUserId: $userId, institutionInstitutionId: $institutionId) {
              id
          }
      }
  `, {userId, institutionId}, userToken, (error: any) => {
      context.action = setNotification(error.message, NotificationType.ERROR)
  });
  return data;
}
//TODO put this in Prendus Shared because it is used in the Login component as well
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
        error.message = "There was a problem adding the LTI token to your user account. Contact support@prendus.com for help"
        throw error;
      });
  }
}
function _clearFormData(context: PrendusUserAccount){
  context.shadowRoot.querySelector('#email').value = '';
  context.shadowRoot.querySelector('#password').value = '';
  context.shadowRoot.querySelector('#confirm-password').value = '';
  context.action = fireLocalAction(context.componentId, "institution", '');
}
