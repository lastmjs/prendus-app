import {ContainerElement} from '../../typings/container-element';
import {State} from '../../typings/state';
import {User} from '../../typings/user';
import {SetPropertyAction, DefaultAction, SetComponentPropertyAction} from '../../typings/actions';
import {createUUID, fireLocalAction} from '../../node_modules/prendus-shared/services/utilities-service';
import {EMAIL_REGEX, NotificationType} from '../../services/constants-service';

class PrendusSearch extends Polymer.Element implements ContainerElement {
    componentId: string;
    action: SetPropertyAction | DefaultAction | SetComponentPropertyAction;
    userToken: string | null;
    client: any;
    index: any;
    searchResult: string;
    searchResults: string[];
    searchIndex: string;
    attributesToRetrieve: string[];
    hitsPerPage: number;

    static get is() { return 'prendus-search'; }
    static get properties() {
        return {
            redirectUrl: {
                type: String
            },
            searchIndex: {
                type: String,
                observer: 'searchContent'
            },
            attributesToRetrieve: {
                type: Array,
            },
            hitsPerPage: {
                type: Number
            }
        };
    }

    constructor() {
        super();
        this.componentId = createUUID();
    }

    connectedCallback() {
        super.connectedCallback();
    }
    searchContent(){
      const algoliaSearchInfo = algoliasearch("A8Q4DSJYC8", "beae44a49319e914ae864dc85bc6f957");
      const hitsToReturn = this.hitsPerPage ? this.hitsPerPage : 3;
      console.log('this.algoliasearch', algoliaSearchInfo)
      console.log('this.searchIndex', this.searchIndex)
      console.log('this.hits', hitsToReturn)
      console.log('this.attributesToRetrieve', this.attributesToRetrieve)

      // this.client = algoliasearch("A8Q4DSJYC8", "beae44a49319e914ae864dc85bc6f957");
      this.index = algoliaSearchInfo.initIndex('Institutions');
    }
    findInstitution(){
      const that = this;
      this.index.search(
        {
          query: institutionPartialName,
          attributesToRetrieve: ['Name'],
          hitsPerPage: 3,
        },
        function searchDone(err: Error, content: any) {
          if (err) {
            console.error(err);
            return err;
          }
          const institutionNames = content.hits.map(hit => hit.Name);
          that.institutions = institutionNames;
          return institutionNames;
        }
      );
    }
    setInstitution(e){
      console.log('e.target', e.target.id)
      this.action = fireLocalAction(this.componentId, "institution", e.target.id)
    }
    stateChange(e: CustomEvent) {
        const state: State = e.detail.state;
        const componentState = state.components[this.componentId] || {};
        const keys = Object.keys(componentState);
        if (keys.includes('client')) this.client = componentState.client;
        this.user = state.user;
        this.userToken = state.userToken;
    }
}

window.customElements.define(PrendusSearch.is, PrendusSearch);
