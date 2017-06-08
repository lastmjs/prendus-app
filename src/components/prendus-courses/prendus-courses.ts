import {GQLQuery, GQLMutate, GQLSubscribe} from '../../services/graphql-service';
import {ContainerElement} from '../../typings/container-element';
import {Course} from '../../typings/course';
import {SetPropertyAction, SetComponentPropertyAction, DefaultAction} from '../../typings/actions';
import {User} from '../../typings/user';
import {State} from '../../typings/state';
import {checkForUserToken, getAndSetUser} from '../../redux/actions';

class PrendusCourses extends Polymer.Element implements ContainerElement {
    courses: Course[];
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction | DefaultAction;
    loaded: boolean;
    userToken: string | null;
    user: User | null;

    static get is() { return 'prendus-courses'; }

    async connectedCallback() {
        super.connectedCallback();

        //always set the componentId before firing other actions within a component
        this.componentId = this.shadowRoot.querySelector('#reduxStoreElement').elementId;
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: false
        };

        this.action = checkForUserToken();
        this.action = await getAndSetUser();

        await this.loadData();

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: true
        };

        this.subscribeToData();
    }

    async loadData() {
        await GQLQuery(`
            query {
                coursesFromUser${this.user ? this.user.id : null}: allCourses(filter: {
                    author: {
                        id: "${this.user ? this.user.id : null}"
                    }
                }) {
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
            console.log(error);
        });
    }

    subscribeToData() {
        GQLSubscribe(`
            subscription changedCourse {
                Course(
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

    async stateChange(e: CustomEvent) {
        const state: State = e.detail.state;

        this.courses = state[`coursesFromUser${this.user ? this.user.id : null}`];
        this.loaded = state.components[this.componentId] ? state.components[this.componentId].loaded : this.loaded;
        this.userToken = state.userToken;
        this.user = state.user;
    }
}

window.customElements.define(PrendusCourses.is, PrendusCourses);
