import {GQLQuery, GQLMutate, GQLSubscribe} from '../../services/graphql-service';
import {ContainerElement} from '../../typings/container-element';
import {Mode} from '../../typings/mode';
import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {Subject} from '../../typings/subject';
import {Discipline} from '../../typings/discipline';
import {User} from '../../typings/user';

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
        return mode === 'edit' || mode === 'create';
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
    subscribeToData() {
      
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

    // async saveCourse() {
    //     const title = this.shadowRoot.querySelector('#titleInput').value;
    //
    //     //TODO replace this with an updateOrCreate mutation once you figure out how to do that. You had a conversation on slack about it
    //     if (this.courseId) {
    //         GQLMutate(`
    //             mutation {
    //                 updateCourse(
    //                     id: "${this.courseId}"
    //                     title: "${title}"
    //                 ) {
    //                     id
    //                 }
    //             }
    //         `, this.userToken, (error: any) => {
    //             alert(error);
    //         });
    //     }
    //     else {
    //         const data = await GQLMutate(`
    //             mutation {
    //                 createCourse(
    //                     title: "${title}"
    //                     authorId: "${this.user.id}"
    //                 ) {
    //                     id
    //                 }
    //             }
    //         `, this.userToken, (error: any) => {
    //             alert(error);
    //         });
    //
    //         this.action = {
    //             type: 'SET_COMPONENT_PROPERTY',
    //             componentId: this.componentId,
    //             key: 'courseId',
    //             value: data.createCourse.id
    //         };
    //     }
    // }

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
