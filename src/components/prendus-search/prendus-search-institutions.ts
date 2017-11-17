import {GQLRequest, GQLSubscribe} from '../../node_modules/prendus-shared/services/graphql-service';
import {ContainerElement} from '../../typings/container-element';
import {Course} from '../../typings/course';
import {SetPropertyAction, SetComponentPropertyAction, DefaultAction} from '../../typings/actions';
import {User} from '../../typings/user';
import {Institution} from '../../typings/institution';
import {Discipline} from '../../typings/discipline';
import {Subject} from '../../typings/subject';
import {State} from '../../typings/state';
import {checkForUserToken, getAndSetUser, setNotification} from '../../redux/actions';
import {createUUID, navigate, fireLocalAction} from '../../node_modules/prendus-shared/services/utilities-service';
import {NotificationType} from '../../services/constants-service';

class PrendusSearchInstitutions extends Polymer.Element implements ContainerElement {
    courses: Course[];
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction | DefaultAction;
    loaded: boolean;
    userToken: string | null;
    user: User | null;
    newCourseTitle: string | null;
    client: any;
    index: any;
    institution: string;
    institutions: string[];
    institutionPartialName: string;
    createInstitutionModalOpen: boolean;

    static get is() { return 'prendus-search-institutions'; }

    constructor() {
        super();
        this.componentId = createUUID();
    }

    async connectedCallback() {
        super.connectedCallback();
        this.action = checkForUserToken();
        this.action = await getAndSetUser();
        this.action = fireLocalAction(this.componentId, "createInstitutionModalOpen", false);
    }

    openCreateInstitutionModal(){
      this.action = fireLocalAction(this.componentId, "createInstitutionModalOpen", true);
    }
    closeCreateInstitutionModal(){
      this.action = fireLocalAction(this.componentId, "createInstitutionModalOpen", false);
    }
    findInstitution(){
      this.action = fireLocalAction(this.componentId, "institutionPartialName", this.shadowRoot.querySelector('#institution').value)
      // this.action = fireLocalAction(this.componentId, "institutionPartialName", this.shadowRoot.querySelector('#institution').shadowRoot.querySelector('#autocompleteInput').value)
      const institutionPartialName: string = this.shadowRoot.querySelector('#institution').value;
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
    async stateChange(e: CustomEvent) {
        const state = e.detail.state;
        const componentState = state.components[this.componentId] || {};
        const keys = Object.keys(componentState);
        if (keys.includes('institution')) this.institution = componentState.institution;
        if (keys.includes('institutions')) this.institutions = componentState.institutions;
        if (keys.includes('institutionPartialName')) this.institutionPartialName = componentState.institutionPartialName;
        if (keys.includes('createInstitutionModalOpen')) this.createInstitutionModalOpen = componentState.createInstitutionModalOpen;
        this.userToken = state.userToken;
        this.user = state.user;
    }
}

window.customElements.define(PrendusSearchInstitutions.is, PrendusSearchInstitutions);
