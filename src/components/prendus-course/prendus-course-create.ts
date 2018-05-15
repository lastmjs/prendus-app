import {GQLRequest, GQLSubscribe} from '../../node_modules/prendus-shared/services/graphql-service';
import {ContainerElement} from '../../typings/container-element';
import {Course} from '../../typings/course';
import {SetPropertyAction, SetComponentPropertyAction, DefaultAction} from '../../typings/actions';
import {User} from '../../typings/user';
import {Institution} from '../../typings/institution';
import {Discipline} from '../../typings/discipline';
import {Subject} from '../../typings/subject';
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
    institution: string;
    institutions: string[];
    institutionPartialName: string;
    disciplinePartialName: string;
    discipline: Discipline;
    disciplines: string[];
    subject: Subject;
    subjects: string[]
    subjectPartialName: string;
    createInstitutionModalOpen: boolean;
    createDisciplineModalOpen: boolean;
    createSubjectModalOpen: boolean;
    createInstitutionButtonDisabled: boolean;
    createDisciplineButtonDisabled: boolean;
    createSubjectButtonDisabled: boolean;

    static get is() { return 'prendus-course-create'; }

    constructor() {
        super();

        this.componentId = createUUID();
    }

    async connectedCallback() {
        super.connectedCallback();
        this.action = checkForUserToken();
        this.action = await getAndSetUser();
        this.action = fireLocalAction(this.componentId, "loaded", false);
        this.action = fireLocalAction(this.componentId, "createInstitutionModalOpen", false);
        this.action = fireLocalAction(this.componentId, "createDisciplineModalOpen", false);
        this.action = fireLocalAction(this.componentId, "createSubjectModalOpen", false);
        this.action = fireLocalAction(this.componentId, "createInstitutionButtonDisabled", true);
        this.action = fireLocalAction(this.componentId, "createDisciplineButtonDisabled", true);
        this.action = fireLocalAction(this.componentId, "createSubjectButtonDisabled", true);
        this.action = fireLocalAction(this.componentId, "loaded", true);
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
    openCreateInstitutionModal(){
      this.action = fireLocalAction(this.componentId, "createInstitutionModalOpen", true);
    }
    findInstitution(){
      this.action = fireLocalAction(this.componentId, "institutionPartialName", this.shadowRoot.querySelector('#institution').value)
      // this.action = fireLocalAction(this.componentId, "institutionPartialName", this.shadowRoot.querySelector('#institution').shadowRoot.querySelector('#autocompleteInput').value)
      const institutionPartialName: string = this.shadowRoot.querySelector('#institution').value;
    }
    loadInstitutions(e: any){
      //This is so that the autocomplete will function correctly.
      const institutions = e.detail.results.map((result: Institution) => {
        return {
          id: "id",
          //change to result.name once Algolia is updated
          text: result.Name,
          value: result.Name
        }
      })
      this.action = fireLocalAction(this.componentId, "institutions", institutions)
    }
    createCourseOnEnter(e){
      if(e.keyCode == 13){
        console.log('create Course on Enter')
      }
    }
    async stateChange(e: CustomEvent) {
        const state = e.detail.state;
        const componentState = state.components[this.componentId] || {};
        const keys = Object.keys(componentState);
        if (keys.includes('loaded')) this.loaded = componentState.loaded;
        if (keys.includes('institution')) this.institution = componentState.institution;
        if (keys.includes('institutions')) this.institutions = componentState.institutions;
        if (keys.includes('institutionPartialName')) this.institutionPartialName = componentState.institutionPartialName;
        if (keys.includes('discipline')) this.disciplinePartialName = componentState.disciplinePartialName;
        if (keys.includes('disciplines')) this.disciplinePartialName = componentState.disciplinePartialName;
        if (keys.includes('disciplinePartialName')) this.disciplinePartialName = componentState.disciplinePartialName;
        if (keys.includes('subject')) this.subjectPartialName = componentState.subjectPartialName;
        if (keys.includes('subjects')) this.subjectPartialName = componentState.subjectPartialName;
        if (keys.includes('subjectPartialName')) this.subjectPartialName = componentState.subjectPartialName;
        if (keys.includes('createInstitutionModalOpen')) this.createInstitutionModalOpen = componentState.createInstitutionModalOpen;
        if (keys.includes('createDisciplineModalOpen')) this.createDisciplineModalOpen = componentState.createDisciplineModalOpen;
        if (keys.includes('createSubjectModalOpen')) this.createSubjectModalOpen = componentState.createSubjectModalOpen;
        if (keys.includes('createInstitutionButtonDisabled')) this.createInstitutionButtonDisabled = componentState.createInstitutionButtonDisabled;
        if (keys.includes('createDisciplineButtonDisabled')) this.createDisciplineButtonDisabled = componentState.createDisciplineButtonDisabled;
        if (keys.includes('createSubjectButtonDisabled')) this.createSubjectButtonDisabled = componentState.createSubjectButtonDisabled;
        this.userToken = state.userToken;
        this.user = state.user;
    }
}

window.customElements.define(PrendusCourseCreate.is, PrendusCourseCreate);
