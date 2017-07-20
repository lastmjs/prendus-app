import {GQLQuery, GQLMutate, GQLSubscribe} from '../../services/graphql-service.js';
import {ContainerElement} from '../../typings/container-element.js';
import {Mode} from '../../typings/mode.js';
import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions.js';
import {Subject} from '../../typings/subject.js';
import {Discipline} from '../../typings/discipline.js';
import {User} from '../../typings/user.js';
import {createUUID} from '../../services/utilities-service.js';

class PrendusDiscipline extends Polymer.Element implements ContainerElement {
    disciplineId: string;
    discipline: Discipline;
    subjects: Subject[];
    mode: Mode;
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction;
    loaded: boolean;
    userToken: string;
    user: User;

    static get is() { return 'prendus-discipline'; }
    static get properties() {
        return {
            disciplineId: {
                observer: 'disciplineIdChanged'
            },
            mode: {

            }
        };
    }
    constructor() {
        super();
        this.componentId = createUUID();
    }

    connectedCallback() {
        super.connectedCallback();
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
        return mode === 'edit';
    }

    isCreateMode(mode: Mode) {
        return mode === 'create';
    }

    async disciplineIdChanged() {
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'disciplineId',
            value: this.disciplineId
        };

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: false
        };
        await this.loadData();
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: true
        };
    }
    async loadData() {
        await GQLQuery(`
            query {
                subjectsFromDiscipline${this.disciplineId}: allSubjects(filter: {
                    discipline: {
                        id: "${this.disciplineId}"
                    }
                }) {
                    id
                    title
                }
                discipline${this.disciplineId}: Discipline(id: "${this.disciplineId}") {
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

    async saveDiscipline() {
        const title = this.shadowRoot.querySelector('#titleInput').value;
        //TODO replace this with an updateOrCreate mutation once you figure out how to do that. You had a conversation on slack about it
        if (this.disciplineId) {
            GQLMutate(`
                mutation {
                    updateDiscipline(
                        id: "${this.disciplineId}"
                        title: "${title}"
                    ) {
                        id
                    }
                }
            `, this.userToken, (error: any) => {
                alert(error);
            });
        }
        else {
            const data = await GQLMutate(`
                mutation {
                    createDiscipline(
                        title: "${title}"
                    ) {
                        id
                    }
                }
            `, this.userToken, (error: any) => {
              console.log('error', error)
                alert(error);
            });

            this.action = {
                type: 'SET_COMPONENT_PROPERTY',
                componentId: this.componentId,
                key: 'disciplineId',
                value: data.createDiscipline.id
            };
        }
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        this.disciplineId = state.components[this.componentId] ? state.components[this.componentId].disciplineId : this.disciplineId;
        this.subjects = state[`subjectsFromDiscipline${this.disciplineId}`];
        this.discipline = state[`discipline${this.disciplineId}`];
        this.loaded = state.components[this.componentId] ? state.components[this.componentId].loaded : this.loaded;
        this.userToken = state.userToken;
        this.user = state.user;
    }
}

window.customElements.define(PrendusDiscipline.is, PrendusDiscipline);
