import {SetPropertyAction, SetComponentPropertyAction, DefaultAction} from '../../typings/actions';
import {GQLRequest, GQLSubscribe} from '../../node_modules/prendus-shared/services/graphql-service';
import {setNotification} from '../../redux/actions';
import {createUUID, navigate, fireLocalAction} from '../../node_modules/prendus-shared/services/utilities-service';
import {NotificationType, QuestionType} from '../../services/constants-service';
import {User} from '../../typings/user';
import {Discipline} from '../../typings/discipline'
import {GQLVariables} from '../../typings/gql-variables';

class PrendusDisciplineEdit extends Polymer.Element {
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction | DefaultAction;
    user: User;
    discipline: Discipline;
    createDisciplineButtonDisabled: boolean;

    static get is() { return 'prendus-discipline-edit'; }

    constructor() {
        super();
        this.componentId = createUUID();
    }
    connectedCallback() {
        super.connectedCallback();
        setTimeout(() => {
          this.action = fireLocalAction(this.componentId, "createDisciplineButtonDisabled", true);
        });
    }
    checkIfDisciplineFormReadyToSubmit(){
      const variables: Discipline = this.getDisciplineVars();
      (variables.title) ? this.action = fireLocalAction(this.componentId, "createDisciplineButtonDisabled", false) : this.action = fireLocalAction(this.componentId, "createInstitutionButtonDisabled", true);
      const checksPass = (variables.title) ? variables : false;
      return checksPass;
    }
    getDisciplineVars(){
      const disciplineTitle = this.shadowRoot.querySelector('#disciplineTitle').value;

      return {
        title: disciplineTitle,
      }
    }
    enableCreateDisciplineAndSubmitOnEnter(e: any){
      this.checkIfDisciplineFormReadyToSubmit();
      if(e.keyCode === 13) this.createInstitution();
    }
    async createDiscipline(){
      const disciplineVars = this.checkIfDisciplineFormReadyToSubmit();
      if(disciplineVars){
        try{
          const discipline = await this.saveDiscipline(disciplineVars);
          const evt = new CustomEvent('discipline-created', {detail: {discipline}});
          this.dispatchEvent(evt);
          //Fire the action here to send institution data to the client.
        }catch(error){
          this.action = setNotification(error.message, NotificationType.ERROR);
        }
      }
    }
    _handleGQLError(err: any) {
      this.action = setNotification(err.message, NotificationType.ERROR);
    }
    async saveDiscipline(variables: GQLVariables): Promise<{}|null> {
      try{
        const data = await GQLRequest(`mutation newDiscipline($name: String!, $abbreviation: String!, $country: String!, $city: String!, $state: String!) {
          createDiscipline(
            name: $name,
            abbreviation: $abbreviation,
            country: $country,
            state: $state,
            city: $city,
          ) {
            id
            name
          }
        }`, variables, "", this._handleGQLError.bind(this));
        if (!data) {
          throw "Unable to save discipline"
        }
        return data.createDiscipline;
      }catch(error){
        throw error;
      }
    }
    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        const componentState = state.components[this.componentId] || {};
        const keys = Object.keys(componentState);
        if (keys.includes('createDisciplineButtonDisabled')) this.createDisciplineButtonDisabled = componentState.createDisciplineButtonDisabled;
        this.userToken = state.userToken;
        this.user = state.user;
    }
}

window.customElements.define(PrendusDisciplineEdit.is, PrendusDisciplineEdit);
