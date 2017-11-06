import {SetPropertyAction, SetComponentPropertyAction, DefaultAction} from '../../typings/actions';
import {GQLRequest, GQLSubscribe} from '../../node_modules/prendus-shared/services/graphql-service';
import {ContainerElement} from '../../typings/container-element';
import {checkForUserToken, getAndSetUser, setNotification} from '../../redux/actions';
import {createUUID, navigate, fireLocalAction} from '../../node_modules/prendus-shared/services/utilities-service';
import {NotificationType, QuestionType} from '../../services/constants-service';
import {User} from '../../typings/user';
import {GQLVariables} from '../../typings/gql-variables';

class PrendusCreateInstitution extends Polymer.Element implements ContainerElement {
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction | DefaultAction;
    user: User;
    userToken: string;
    institutionName: string;
    institutionAbbreviation: string;
    institutionCountry: string;
    institutionState: string;
    institutionCity: string;

    static get is() { return 'prendus-create-institution'; }

    constructor() {
        super();
        this.componentId = createUUID();
    }
    async connectedCallback() {
        super.connectedCallback();
    }
    checkIfInstitutionFormReadyToSubmit(){
      const variables = getAndSetInstitutionVars();
      console.log('variables check', variables);
    }
    getAndSetInstitutionVars(){
      this.shadowRoot.querySelector('#institutionName').value ? fireLocalAction(this.componentId, 'institutionName', this.shadowRoot.querySelector('#institutionName').value) : null;
      this.shadowRoot.querySelector('#institutionAbbreviation').value ? fireLocalAction(this.componentId, 'institutionAbbreviation', this.shadowRoot.querySelector('#institutionAbbreviation').value) : null;
      this.shadowRoot.querySelector('#institutionCountry').value ? fireLocalAction(this.componentId, 'institutionCountry', this.shadowRoot.querySelector('#institutionCountry').value) : null;
      this.shadowRoot.querySelector('#institutionState').value ? fireLocalAction(this.componentId, 'institutionState', this.shadowRoot.querySelector('#institutionState').value) : null;
      this.shadowRoot.querySelector('#institutionCity').value ? fireLocalAction(this.componentId, 'institutionCity', this.shadowRoot.querySelector('#institutionCity').value) : null;

      return {
        name: this.institutionName,
        abbreviation: this.institutionAbbreviation,
        country: this.institutionCountry,
        state: this.institutionState,
        city: this.institutionCity,
        user: this.user,
      }
    }
    createInstitutionOnEnter(e){
      console.log('e', e)
      this.checkIfInstitutionFormReadyToSubmit();
    }
    createInstitution(){
      this.checkIfInstitutionFormReadyToSubmit();
      try{
        saveInstitution(institutionVars)
      }
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        const componentState = state.components[this.componentId] || {};
        const keys = Object.keys(componentState);
        if (keys.includes('institutionName')) this.institutionName = componentState.institutionName;
        if (keys.includes('institutionAbbreviation')) this.institutionAbbreviation = componentState.institutionAbbreviation;
        if (keys.includes('institutionCountry')) this.institutionCountry = componentState.institutionCountry;
        if (keys.includes('institutionState')) this.institutionState = componentState.institutionState;
        if (keys.includes('institutionCity')) this.institutionCity = componentState.institutionCity;
        this.userToken = state.userToken;
        this.user = state.user;
    }
}

window.customElements.define(PrendusCreateInstitution.is, PrendusCreateInstitution);

async function saveInstitution(variables: GQLVariables): Promise<string|null> {
  console.log('variables', variables)
  try{
    const data = await GQLRequest(`mutation newInstitution($authorId: ID!, $conceptId: ID!, $resource: String!, $text: String!, $code: String!, $assignmentId: ID!, $imageIds: [ID!]!, $answerComments: [QuestionanswerCommentsAnswerComment!]!) {
      createQuestion(
        authorId: $authorId,
        conceptId: $conceptId,
        assignmentId: $assignmentId,
        resource: $resource,
        text: $text,
        code: $code,
        imagesIds: $imageIds
        answerComments: $answerComments
      ) {
        id
      }
    }`, variables, this.userToken, this._handleGQLError.bind(this));
    if (!data) {
      throw "Unable to save institution"
    }
    return data.createQuestion.id;
  }catch(error){
    throw error;
  }
}
