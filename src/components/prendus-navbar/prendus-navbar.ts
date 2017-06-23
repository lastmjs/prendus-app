import {GQLQuery, GQLMutate, GQLSubscribe} from '../../services/graphql-service';
import {ContainerElement} from '../../typings/container-element';
import {SetPropertyAction, SetComponentPropertyAction, DefaultAction} from '../../typings/actions';
import {User} from '../../typings/user';
import {checkForUserToken, getAndSetUser} from '../../redux/actions';
import {createUUID, navigate} from '../../services/utilities-service';

class PrendusNavbar extends Polymer.Element implements ContainerElement {
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction | DefaultAction;
    loaded: boolean;
    userToken: string;
    user: User;

    static get is() { return 'prendus-navbar'; }

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

        this.action = checkForUserToken();
    }


    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        if (Object.keys(state.components[this.componentId] || {}).includes('loaded')) this.loaded = state.components[this.componentId].loaded;
        this.userToken = state.userToken;
        this.user = state.user;
        console.log('state', state)
    }
}

window.customElements.define(PrendusNavbar.is, PrendusNavbar);
