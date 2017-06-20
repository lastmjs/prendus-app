import {GQLQuery, GQLMutate, GQLSubscribe} from '../../services/graphql-service';
import {ContainerElement} from '../../typings/container-element';
import {Mode} from '../../typings/mode';
import {SetPropertyAction, SetComponentPropertyAction, DefaultAction} from '../../typings/actions';
import {Assignment} from '../../typings/assignment';
import {Course} from '../../typings/course';
import {User} from '../../typings/user';
import {checkForUserToken, getAndSetUser} from '../../redux/actions';
import {createUUID} from '../../services/utilities-service';

class PrendusCourse extends Polymer.Element implements ContainerElement {
    courseId: string;
    mode: Mode;
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction | DefaultAction;
    assignments: Assignment[];
    course: Course;
    loaded: boolean;
    userToken: string;
    user: User;

    static get is() { return 'prendus-course'; }
    static get properties() {
        return {
            courseId: {
                observer: 'courseIdChanged'
            },
            mode: {

            }
        };
    }

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
        this.action = await getAndSetUser();
        this.subscribeToData();
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

    async courseIdChanged() {
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'courseId',
            value: this.courseId
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
                assignmentsFromCourse${this.courseId}: allAssignments(filter: {
                    course: {
                        id: "${this.courseId}"
                    }
                }) {
                    id
                    title
                }
                course${this.courseId}: Course(id: "${this.courseId}") {
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
            console.log(error);
        });
    }

    subscribeToData() {
        GQLSubscribe(`
            subscription changedAssignment {
                Assignment(
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

    async saveCourse() {
        const title = this.shadowRoot.querySelector('#titleInput').value;

        const data = await GQLMutate(`
            mutation {
                updateOrCreateCourse(
                    update: {
                        id: "${this.courseId}"
                        title: "${title}"
                    }
                    create: {
                        title: "${title}"
                        authorId: "${this.user.id}"
                    }
                ) {
                    id
                }
            }
        `, this.userToken, (error: any) => {
            console.log(error);
        });

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'courseId',
            value: data.updateOrCreateCourse.id
        };
    }

    stateChange(e: CustomEvent) {
        const state = e.detail.state;

        if (Object.keys(state.components[this.componentId] || {}).includes('courseId')) this.courseId = state.components[this.componentId].courseId;
        if (Object.keys(state.components[this.componentId] || {}).includes('loaded')) this.loaded = state.components[this.componentId].loaded;
        this.assignments = state[`assignmentsFromCourse${this.courseId}`];
        this.course = state[`course${this.courseId}`];
        this.userToken = state.userToken;
        this.user = state.user;
    }
}

window.customElements.define(PrendusCourse.is, PrendusCourse);
