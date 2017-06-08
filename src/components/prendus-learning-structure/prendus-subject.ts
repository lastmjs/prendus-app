import {GQLQuery, GQLMutate, GQLSubscribe} from '../../services/graphql-service';
import {ContainerElement} from '../../typings/container-element';
import {Mode} from '../../typings/mode';
import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {Subject} from '../../typings/subject';
import {Concept} from '../../typings/concept';
import {User} from '../../typings/user';

class PrendusSubject extends Polymer.Element implements ContainerElement {
    subjectId: string;
    subject: Subject;
    disciplineId: string;
    concepts: Concept[];
    mode: Mode;
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction;
    loaded: boolean;
    userToken: string;
    user: User;

    static get is() { return 'prendus-subject'; }
    static get properties() {
        return {
            subjectId: {
                observer: 'subjectIdChanged'
            },
            disciplineId: {

            },
            mode: {

            }
        };
    }

    connectedCallback() {
        super.connectedCallback();

        this.componentId = this.shadowRoot.querySelector('#reduxStoreElement').elementId;
        this.subscribeToData();
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

    async subjectIdChanged() {
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'subjectId',
            value: this.subjectId
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
    subscribeToData() {

    }
    async loadData() {
        await GQLQuery(`
            query {
                conceptsFromSubject${this.subjectId}: allConcepts(filter: {
                    subject: {
                        id: "${this.subjectId}"
                    }
                }) {
                    id
                    title
                }
                subject${this.subjectId}: Subject(id: "${this.subjectId}") {
                    title
                    discipline {
                        id
                    }
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

    async saveSubject() {
        const title = this.shadowRoot.querySelector('#titleInput').value;
        //TODO replace this with an updateOrCreate mutation once you figure out how to do that. You had a conversation on slack about it
        if (this.subjectId) {
            GQLMutate(`
                mutation {
                    updateSubject(
                        id: "${this.subjectId}"
                        title: "${title}"
                        disciplineId: "${this.disciplineId}"
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
                    createSubject(
                        title: "${title}"
                        disciplineId: "${this.disciplineId}"
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
                key: 'subjectId',
                value: data.createSubject.id
            };
        }
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        this.subjectId = state.components[this.componentId] ? state.components[this.componentId].subjectId : this.subjectId;
        this.concepts = state[`conceptsFromSubject${this.subjectId}`];
        this.subject = state[`subject${this.subjectId}`];
        this.disciplineId = this.subject ? this.subject.discipline.id : this.disciplineId;
        this.loaded = state.components[this.componentId] ? state.components[this.componentId].loaded : this.loaded;
        this.userToken = state.userToken;
        this.user = state.user;
    }
}

window.customElements.define(PrendusSubject.is, PrendusSubject);