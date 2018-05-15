// import {SetPropertyAction, SetComponentPropertyAction, DefaultAction} from '../../typings/actions';
// import {GQLRequest, GQLSubscribe} from '../../node_modules/prendus-shared/services/graphql-service';
// import {setNotification} from '../../redux/actions';
// import {createUUID, navigate, fireLocalAction} from '../../node_modules/prendus-shared/services/utilities-service';
// import {NotificationType, QuestionType} from '../../services/constants-service';
// import {User} from '../../typings/user';
// import {Institution} from '../../typings/institution'
// import {GQLVariables} from '../../typings/gql-variables';
//
// class PrendusCreateInstitution extends Polymer.Element {
//     componentId: string;
//     action: SetPropertyAction | SetComponentPropertyAction | DefaultAction;
//     user: User;
//     institution: Institution;
//     createInstitutionButtonDisabled: boolean;
//
//     static get is() { return 'prendus-create-institution'; }
//
//     constructor() {
//         super();
//         this.componentId = createUUID();
//     }
//     connectedCallback() {
//         super.connectedCallback();
//         setTimeout(() => {
//           this.action = fireLocalAction(this.componentId, "createInstitutionButtonDisabled", true);
//         });
//     }
//     checkIfInstitutionFormReadyToSubmit(){
//       const variables: Institution = this.getInstitutionVars();
//       (variables.name && variables.country && variables.state && variables.city) ? this.action = fireLocalAction(this.componentId, "createInstitutionButtonDisabled", false) : this.action = fireLocalAction(this.componentId, "createInstitutionButtonDisabled", true);
//       const checksPass = (variables.name && variables.country && variables.state && variables.city) ? variables : false;
//       return checksPass;
//     }
//     getInstitutionVars(){
//       const institutionName = this.shadowRoot.querySelector('#institutionName').value;
//       const institutionAbbreviation = this.shadowRoot.querySelector('#institutionAbbreviation').value ? this.shadowRoot.querySelector('#institutionAbbreviation').value : '';
//       const institutionCountry = this.shadowRoot.querySelector('#institutionCountry').value;
//       const institutionState = this.shadowRoot.querySelector('#institutionState').value;
//       const institutionCity = this.shadowRoot.querySelector('#institutionCity').value;
//
//       return {
//         name: institutionName,
//         abbreviation: institutionAbbreviation,
//         country: institutionCountry,
//         state: institutionState,
//         city: institutionCity
//       }
//     }
//     enableCreateInstitutionAndSubmitOnEnter(e: any){
//       this.checkIfInstitutionFormReadyToSubmit();
//       if(e.keyCode === 13) this.createInstitution();
//     }
//     async createInstitution(){
//       const institutionVars = this.checkIfInstitutionFormReadyToSubmit();
//       if(institutionVars){
//         try{
//           const institution = await this.saveInstitution(institutionVars);
//           const evt = new CustomEvent('institution-created', {detail: {institution}});
//           this.dispatchEvent(evt);
//           //Fire the action here to send institution data to the client.
//         }catch(error){
//           this.action = setNotification(error.message, NotificationType.ERROR);
//         }
//       }
//     }
//     _handleGQLError(err: any) {
//       this.action = setNotification(err.message, NotificationType.ERROR);
//     }
//     async saveInstitution(variables: GQLVariables): Promise<{}|null> {
//       try{
//         const data = await GQLRequest(`mutation newInstitution($name: String!, $abbreviation: String!, $country: String!, $city: String!, $state: String!) {
//           createInstitution(
//             name: $name,
//             abbreviation: $abbreviation,
//             country: $country,
//             state: $state,
//             city: $city,
//           ) {
//             id
//             name
//           }
//         }`, variables, "", this._handleGQLError.bind(this));
//         if (!data) {
//           throw "Unable to save institution"
//         }
//         return data.createInstitution;
//       }catch(error){
//         throw error;
//       }
//     }
//     fireCancelDialog(e){
//       this.fire
//     }
//     stateChange(e: CustomEvent) {
//         const state = e.detail.state;
//         const componentState = state.components[this.componentId] || {};
//         const keys = Object.keys(componentState);
//         if (keys.includes('createInstitutionButtonDisabled')) this.createInstitutionButtonDisabled = componentState.createInstitutionButtonDisabled;
//         this.userToken = state.userToken;
//         this.user = state.user;
//     }
// }
//
// window.customElements.define(PrendusCreateInstitution.is, PrendusCreateInstitution);
