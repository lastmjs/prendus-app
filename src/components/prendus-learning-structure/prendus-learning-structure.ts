import {GQLRequest, GQLSubscribe} from '../../node_modules/prendus-shared/services/graphql-service';
import {ContainerElement} from '../../typings/container-element';
import {Mode} from '../../typings/mode';
import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {setNotification} from '../../redux/actions';
import {Subject} from '../../typings/subject';
import {Discipline} from '../../typings/discipline';
import {User} from '../../typings/user';
import {createUUID} from '../../node_modules/prendus-shared/services/utilities-service';
import {NotificationType} from '../../services/constants-service';

class PrendusLearningStructure extends Polymer.Element implements ContainerElement {
    disciplines: Discipline[];
    mode: Mode;
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction;
    loaded: boolean;
    userToken: string;
    user: User;

    static get is() { return 'prendus-learning-structure'; }
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
        this.subscribeToData();
        await this.loadData();
    }

    isViewMode(mode: Mode) {
        return mode === 'view';
    }

    isEditMode(mode: Mode) {
        return mode === 'edit' || mode === 'create';
    }

    subscribeToData() {
        GQLSubscribe(`
            subscription changedDiscipline {
                Discipline(
                    filter: {
                        mutation_in: [CREATED, UPDATED, DELETED]
                    }
                ) {
                    node {
                        id
                    }
                }
            }
        `, this.componentId, (data: any) => {
            this.loadData();
        });
    }
    async loadData() {
        const data = await GQLRequest(`
            query {
              allDisciplines {
                  id
                  title
              }
            }
        `, {}, this.userToken, (error: any) => {
            this.action = setNotification(error.message, NotificationType.ERROR)
        });
        this.action = {
            type: 'SET_PROPERTY',
            key: 'allDisciplines',
            value: data.allDisciplines
        };
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        this.disciplines = state[`allDisciplines`];
        this.loaded = state.components[this.componentId] ? state.components[this.componentId].loaded : this.loaded;
        this.userToken = state.userToken;
        this.user = state.user;
    }
}

window.customElements.define(PrendusLearningStructure.is, PrendusLearningStructure);
