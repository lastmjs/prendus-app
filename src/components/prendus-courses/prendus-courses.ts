import {GQLQuery, GQLMutate, GQLSubscribe} from '../../services/graphql-service.js';
import {ContainerElement} from '../../typings/container-element.js';
import {Course} from '../../typings/course.js';
import {SetPropertyAction, SetComponentPropertyAction, DefaultAction} from '../../typings/actions.js';
import {User} from '../../typings/user.js';
import {State} from '../../typings/state.js';
import {checkForUserToken, getAndSetUser} from '../../redux/actions.js';
import {createUUID, navigate} from '../../services/utilities-service.js';

class PrendusCourses extends Polymer.Element implements ContainerElement {
    courses: Course[];
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction | DefaultAction;
    loaded: boolean;
    userToken: string | null;
    user: User | null;

    static get is() { return 'prendus-courses'; }

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
    async openDeleteModal(e: any): void {
      e.stopPropagation();
			e.preventDefault();
      const data = await GQLMutate(`
        mutation {
          deleteCourse(
            id: "${e.model.item.id}"
          ) {
            id
          }
        }
      `, this.userToken, (error: any) => {
          console.log(error);
      });
      this.loadData()
			// this.shadowRoot.querySelector('#confirm-delete-modal').open();
		}
    //We need to think about how we delete courses. Should we allow instructors to delete courses when there is live student data? I don't think GraphCool will let us. Maybe we could disassociate the course with the professor though?
    deleteCourse(e: any){
      this.shadowRoot.querySelector('#confirm-delete-modal').close();
    }
    openCreateCourseDialog(){
      this.shadowRoot.querySelector('#add-course-modal').open();
    }
    async createCourse(){
      const title = this.shadowRoot.querySelector('#titleInput').value;
      const data = await GQLMutate(`
          mutation {
              createCourse(
                title: "${title}"
                authorId: "${this.user.id}"
              ){
                id
                title
              }
          }
      `, this.userToken, (error: any) => {
          console.log(error);
      });
      this.shadowRoot.querySelector('#add-course-modal').close();
      navigate(`/course/${data.createCourse.id}/edit`)
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

        if (Object.keys(state.components[this.componentId] || {}).includes('loaded')) this.loaded = state.components[this.componentId].loaded;
        this.courses = state[`coursesFromUser${this.user ? this.user.id : null}`];
        this.userToken = state.userToken;
        this.user = state.user;
    }
}

window.customElements.define(PrendusCourses.is, PrendusCourses);
