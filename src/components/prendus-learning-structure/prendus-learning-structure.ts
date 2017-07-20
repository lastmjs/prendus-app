import {GQLQuery, GQLMutate, GQLSubscribe} from '../../services/graphql-service.js';
import {ContainerElement} from '../../typings/container-element.js';
import {Mode} from '../../typings/mode.js';
import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions.js';
import {Subject} from '../../typings/subject.js';
import {Discipline} from '../../typings/discipline.js';
import {User} from '../../typings/user.js';
import {createUUID} from '../../services/utilities-service.js';

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
        await GQLQuery(`
            query {
              allDisciplines {
                  id
                  title
              }
            }
        `, this.userToken, (key: string, value: any) => {
            this.action = {
                type: 'SET_PROPERTY',
                key,
                value
            };
        }, (error: any) => {
            alert(error);
        });
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
