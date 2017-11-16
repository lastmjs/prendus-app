import {GQLRequest, GQLSubscribe} from '../../node_modules/prendus-shared/services/graphql-service';
import {ContainerElement} from '../../typings/container-element';
import {Course} from '../../typings/course';
import {SetPropertyAction, SetComponentPropertyAction, DefaultAction} from '../../typings/actions';
import {User} from '../../typings/user';
import {State} from '../../typings/state';
import {checkForUserToken, getAndSetUser, setNotification} from '../../redux/actions';
import {createUUID, navigate, fireLocalAction} from '../../node_modules/prendus-shared/services/utilities-service';
import {NotificationType} from '../../services/constants-service';

class PrendusCourseCreate extends Polymer.Element implements ContainerElement {
    courses: Course[];
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction | DefaultAction;
    loaded: boolean;
    userToken: string | null;
    user: User | null;
    newCourseTitle: string | null;
    client: any;
    index: any;

    static get is() { return 'prendus-course-create'; }

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

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: true
        };

        this.subscribeToData();
    }

    findDisciplines(){
      this.client = algoliasearch("A8Q4DSJYC8", "beae44a49319e914ae864dc85bc6f957");
      this.index = this.client.initIndex('Discipline');
      const departmentPartialName: string = this.shadowRoot.querySelector('#department').value;
      const that = this;
      this.index.search(
        {
          query: departmentPartialName,
          attributesToRetrieve: ['title', 'id'],
          hitsPerPage: 3,
        },
        function searchDone(err: Error, content: any) {
          if (err) {
            console.error(err);
            return err;
          }
          const departmentNames = content.hits.map(hit => hit.title);
          // that.institutions = institutionNames;
          console.log('departmentNames', departmentNames)
          return departmentNames;
        }
      );
    }
    async createCourse(){
      const title = this.shadowRoot.querySelector('#titleInput').value;
      const disciplineId = this.shadowRoot.querySelector('#department').value;
      const subjectId = this.shadowRoot.querySelector('#subject').value;
      const courseNumber = this.shadowRoot.querySelector('#courseNumber').value;
      if(title){
        const data = await GQLRequest(`
            mutation create($title: String!, $id: ID!) {
                createCourse(
                  title: $title
                  authorId: $id
                ){
                  id
                  title
                }
            }
        `, {title, disciplineId, subjectId, courseNumber, id: this.user.id}, this.userToken, (error: any) => {
          this.action = setNotification(error.message, NotificationType.ERROR)
        });
        this.shadowRoot.querySelector('#add-course-modal').value = null;
        this.shadowRoot.querySelector('#add-course-modal').close();
        navigate(`/course/${data.createCourse.id}/edit`)
      }else{
        this.action = setNotification("Add a title to continue", NotificationType.ERROR)
      }

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
    submitOnEnter(e: any) {
      if(e.keyCode === 13 && this.shadowRoot.querySelector(`#${e.target.id}`).value) this.createCourse();
    }
    async stateChange(e: CustomEvent) {
        const state: State = e.detail.state;
        if (Object.keys(state.components[this.componentId] || {}).includes('loaded')) this.loaded = state.components[this.componentId].loaded;
        this.courses = state[`coursesFromUser${this.user ? this.user.id : null}`];
        this.userToken = state.userToken;
        this.user = state.user;
    }
}

window.customElements.define(PrendusCourseCreate.is, PrendusCourseCreate);
