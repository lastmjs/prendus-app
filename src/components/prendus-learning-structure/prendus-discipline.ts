import {GQLRequest, GQLSubscribe} from '../../node_modules/prendus-shared/services/graphql-service';
import {setNotification} from '../../redux/actions';
import {createUUID} from '../../node_modules/prendus-shared/services/utilities-service';
import {NotificationType} from '../../services/constants-service';

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
        const subjectKey = `subjectsFromDiscipline${this.disciplineId}`;
        const disciplineKey = `discipline${this.disciplineId}`;
        const data = await GQLRequest(`
            query subjectsAndDiscipline($disciplineId: ID!) {
                ${subjectKey}: allSubjects(filter: {
                    discipline: {
                        id: $disciplineId
                    }
                }) {
                    id
                    title
                }
                ${disciplineKey}: Discipline(id: $disciplineId) {
                    title
                }
            }
        `, {disciplineId: this.disciplineId}, this.userToken, (error: any) => {
          this.action = setNotification(error.message, NotificationType.ERROR)
        });
        this.action = {
            type: 'SET_PROPERTY',
            key: subjectKey,
            value: data[subjectKey]
        };
        this.action = {
            type: 'SET_PROPERTY',
            key: disciplineKey,
            value: data[disciplineKey]
        };
    }

    async saveDiscipline() {
        const title = this.shadowRoot.querySelector('#titleInput').value;
        //TODO replace this with an updateOrCreate mutation once you figure out how to do that. You had a conversation on slack about it
        if (this.disciplineId) {
            GQLRequest(`
                mutation discipline($disciplineId: ID!, $title: String!) {
                    updateDiscipline(
                        id: $disciplineId
                        title: $title
                    ) {
                        id
                    }
                }
            `, {disciplineId: this.disciplineId, title}, this.userToken, (error: any) => {
                this.action = setNotification(error.message, NotificationType.ERROR)
            });
        }
        else {
            const data = await GQLRequest(`
                mutation discipline($title: String!) {
                    createDiscipline(
                        title: $title
                    ) {
                        id
                    }
                }
            `, {title}, this.userToken, (error: any) => {
                console.log('error', error)
                this.action = setNotification(error.message, NotificationType.ERROR)
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
