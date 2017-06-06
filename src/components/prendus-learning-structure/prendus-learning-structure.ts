import {GQLQuery, GQLMutate, GQLSubscribe} from '../../services/graphql-service';
import {ContainerElement} from '../../typings/container-element';
import {Mode} from '../../typings/mode';
import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {Subject} from '../../typings/subject';
import {Discipline} from '../../typings/discipline';
import {User} from '../../typings/user';

class PrendusLearningStructure extends Polymer.Element implements ContainerElement {
    disciplines: Discipline[];
    mode: Mode;
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction;
    loaded: boolean;
    userToken: string;
    user: User;

    static get is() { return 'prendus-learning-structure'; }

    async connectedCallback() {
        super.connectedCallback();

        this.componentId = this.shadowRoot.querySelector('#reduxStoreElement').elementId;
        this.subscribeToData();
        await this.loadData();
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: true
        };
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
              User(email:"cj3lyatut1ztg0127uizmnb3e") {
                  id
                  email
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
