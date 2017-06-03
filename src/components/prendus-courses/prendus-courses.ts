import {GQLQuery, GQLMutate, GQLSubscribe} from '../../services/graphql-service';
import {ContainerElement} from '../../typings/container-element';
import {Course} from '../../typings/course';
import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';

class PrendusCourses extends Polymer.Element implements ContainerElement {
    courses: Course[];
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction;
    loaded: boolean;
    userToken: string;

    static get is() { return 'prendus-courses'; }

    async connectedCallback() {
        super.connectedCallback();

        this.componentId = this.shadowRoot.querySelector('#reduxStoreElement').elementId;
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
        this.subscribeToData();
    }

    async loadData() {
        await GQLQuery(`
            query {
                allCourses {
                    id
                    title
                }
            }
        `, this.userToken, (key, value) => {
            this.action = {
                type: 'SET_PROPERTY',
                key,
                value
            };
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
        `, this.componentId, (data) => {
            this.loadData();
        });
    }

    async stateChange(e: CustomEvent) {
        const state = e.detail.state;

        this.courses = state.allCourses;
        this.loaded = state.components[this.componentId] ? state.components[this.componentId].loaded : this.loaded;
        this.userToken = state.userToken;
    }
}

window.customElements.define(PrendusCourses.is, PrendusCourses);
