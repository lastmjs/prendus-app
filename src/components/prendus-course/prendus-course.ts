import {GQLQuery, GQLMutate, GQLSubscribe} from '../../services/graphql-service';
import {ContainerElement} from '../../typings/container-element';
import {Mode} from '../../typings/mode';
import {Subject} from '../../typings/subject';
import {Discipline} from '../../typings/discipline';
import {SetPropertyAction, SetComponentPropertyAction, DefaultAction} from '../../typings/actions';
import {Assignment} from '../../typings/assignment';
import {Course} from '../../typings/course';
import {User} from '../../typings/user';
import {checkForUserToken, getAndSetUser} from '../../redux/actions';
import {createUUID, navigate} from '../../services/utilities-service';

class PrendusCourse extends Polymer.Element implements ContainerElement {
    courseId: string;
    mode: Mode;
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction | DefaultAction;
    assignments: Assignment[];
    learningStructure: any;
    course: Course;
    loaded: boolean;
    userToken: string;
    user: User;
    editingTitle: boolean;
    subjects: Subject[];
    selectedDiscipline: Discipline;

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
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: true
        };
        return mode === 'view';
    }

    isEditMode(mode: Mode) {
        return mode === 'edit';
    }
    isCreateMode(mode: Mode) {
        return mode === 'create';
    }
    openCreateDisciplineDialog(e){
      console.log('openingn')
      this.shadowRoot.querySelector('#create-discipline').open();
    }
    async createDiscipline(){
      const data = await GQLMutate(`
          mutation {
              createDiscipline(
                  title: "${this.shadowRoot.querySelector('#discipline-title').value}"
              ) {
                  id
                  title
              }
          }
      `, this.userToken, (error: any) => {
        console.log('error', error)
      });
      //TODO combine this with the creatediscipline above
      this.saveDiscipline(data.createDiscipline.id);
      if(this.subjects){
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'subjects',
            value: null
        };
      }
    }
    //TODO Allow the user to only create one discipline, but allow them to edit that discipline if necessary
    async saveDiscipline(disciplineId: string){
      const courseData = await GQLMutate(`
        mutation {
          addToCourseDiscipline(
            coursesCourseId: "${this.courseId}"
            disciplineDisciplineId: "${disciplineId}"
          ) {
        		disciplineDiscipline{
              title
              subjects{
                id
                title
              }
            }
          }
        }
      `, this.userToken, (error: any) => {
        console.log('error', error)
      });
      this.loadLearningStructure();
      this.shadowRoot.querySelector('#subject-menu').disabled = false;
      this.shadowRoot.querySelector('#create-discipline').close();
    }
    showSubjects(e){
      //Setting this here because we don't want to show concepts that aren't aligned with a Subject. I assume this is the best way to do it?
      this.shadowRoot.querySelector('#subject-menu').disabled = false;
      this.saveDiscipline(this.learningStructure[e.target.id].id);
      this.action = {
          type: 'SET_COMPONENT_PROPERTY',
          componentId: this.componentId,
          key: 'subjects',
          value: this.learningStructure[e.target.id].subjects
      };
    }
    openCreateSubjectDialog(e){
      this.shadowRoot.querySelector('#create-subject').open();
    }
    async saveSubject(){
      const data = await GQLMutate(`
          mutation {
              createSubject(
                  title: "${this.shadowRoot.querySelector('#subject-title').value}"
              ) {
                  id
              }
          }
      `, this.userToken, (error: any) => {
        console.log('error', error)
          alert(error);
      });
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
        await this.loadLearningStructure();
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: true
        };
    }
    getLTILinks(e){
      this.shadowRoot.querySelector(`#assignment-lti-links-modal${e.model.item.id}`).open();
    }
    getEditIcon(editStatus: boolean): string {
  		return editStatus ? 'check' : 'create';
  	}
    async deleteAssignment(e){
      const data = await GQLMutate(`
          mutation {
              deleteAssignment(id: "${e.model.item.id}"){
                id
              }
          }
      `, this.userToken, (error: any) => {
          console.log(error);
      });
      this.loadData();
    }
    async loadData() {
        const data = await GQLQuery(`
            query {
                allAssignments(filter: {
                    course: {
                        id: "${this.courseId}"
                    }
                }) {
                    id
                    title
                }
                Course(id: "${this.courseId}") {
                    title
                }
            }
        `, this.userToken, (key: string, value: any) => {
        }, (error: any) => {
            console.log(error);
        });
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'assignments',
            value: data.allAssignments
        };
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'course',
            value: data.Course
        };
    }
    async titleChanged(e: any){
      if(typeof e.target !== 'undefined' && !e.target.invalid && this.course) {
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'course',
            value: {
              ...this.course,
              title: e.target.value
            }
        };
        this.saveCourse();
      }
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
        const data = await GQLMutate(`
            mutation {
                updateOrCreateCourse(
                    update: {
                        id: "${this.courseId}"
                        title: "${this.course.title}"
                    }
                    create: {
                        title: "${this.course.title}"
                        authorId: "${this.user.id}"
                    }
                ) {
                    id
                    title
                }
            }
        `, this.userToken, (error: any) => {
            console.log(error);
        });
        navigate(`/course/${data.updateOrCreateCourse.id}/edit`)
    }
    async loadLearningStructure(){
      await GQLQuery(`
        query {
          allDisciplines(
            first: 25
            filter: {
              OR: [{
                  courses_some: {
                  id: "${this.courseId}"
                }
              },{
                approved_in:YES
              }]
          }) {
            id
            title
            subjects{
              title
            }
          }
        }
      `, this.userToken, (key: string, value: any) => {
        console.log('value', value)
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'learningStructure',
            value
        };
      }, (error: any) => {
          console.log(error);
      });
    }
    stateChange(e: CustomEvent) {
        const state = e.detail.state;

        if (Object.keys(state.components[this.componentId] || {}).includes('courseId')) this.courseId = state.components[this.componentId].courseId;
        if (Object.keys(state.components[this.componentId] || {}).includes('loaded')) this.loaded = state.components[this.componentId].loaded;
        if (Object.keys(state.components[this.componentId] || {}).includes('assignments')) this.assignments = state.components[this.componentId].assignments;
        if (Object.keys(state.components[this.componentId] || {}).includes('course')) this.course = state.components[this.componentId].course;
        if (Object.keys(state.components[this.componentId] || {}).includes('learningStructure')) this.learningStructure = state.components[this.componentId].learningStructure;
        if (Object.keys(state.components[this.componentId] || {}).includes('subjects')) this.subjects = state.components[this.componentId].subjects;
        if (Object.keys(state.components[this.componentId] || {}).includes('selectedDiscipline')) this.selectedDiscipline = state.components[this.componentId].selectedDiscipline;
//      this.assignments = state[`assignmentsFromCourse${this.courseId}`];
        // this.course = state[`course${this.courseId}`];
        this.userToken = state.userToken;
        this.user = state.user;
    }
}

window.customElements.define(PrendusCourse.is, PrendusCourse);
