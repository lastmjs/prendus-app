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
    selectedDisciplineId: string;
    customDiscipline: boolean;
    customSubject: boolean;
    selectedSubjectId: string;

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
    _fireLocalAction(key: string, value: any) {
      this.action = {
          type: 'SET_COMPONENT_PROPERTY',
        componentId: this.componentId,
        key,
        value
      };
    }
    async connectedCallback() {
        super.connectedCallback();
        this._fireLocalAction('loaded', true)
        this.action = checkForUserToken();
        this.action = await getAndSetUser();
        this.subscribeToData();
    }
    async courseIdChanged() {
        this._fireLocalAction('courseId', this.courseId)
        this._fireLocalAction('loaded', false)
        await this.loadLearningStructure();
        await this.loadData();
        this._fireLocalAction('loaded', true)
    }
    isViewMode(mode: Mode) {
      this._fireLocalAction('loaded', true)
        return mode === 'view';
    }

    isEditMode(mode: Mode) {
        return mode === 'edit';
    }
    isCreateMode(mode: Mode) {
        return mode === 'create';
    }
    openCreateDisciplineDialog(e){
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
      this.saveDisciplineToCourse(data.createDiscipline.id);
      if(this.subjects){
        this._fireLocalAction('subjects', null)
      }
      this.shadowRoot.querySelector('#subject-list').disabled = false;
    }
    async saveDisciplineToCourse(disciplineId: string){
      const courseData = await GQLMutate(`
        mutation {
          addToCourseDiscipline(
            coursesCourseId: "${this.courseId}"
            disciplineDisciplineId: "${disciplineId}"
          ) {
        		disciplineDiscipline{
              id
              title
              approved
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
      this._fireLocalAction('selectedDisciplineId', disciplineId)
      this._fireLocalAction('customSubject', false)
      if(courseData.addToCourseDiscipline.disciplineDiscipline.approved !== "YES"){
        this._fireLocalAction('customDiscipline', true)
      }else{
        this._fireLocalAction('customDiscipline', null)
      }

      this.loadLearningStructure();
      this.shadowRoot.querySelector('#subject-list').disabled = false;
      this.shadowRoot.querySelector('#create-discipline').close();
    }

    async saveSubjectToCourse(subjectId: string){
      const courseData = await GQLMutate(`
        mutation {
          addToCourseSubject(
            coursesCourseId: "${this.courseId}"
            subjectSubjectId: "${subjectId}"
          ) {
            subjectSubject{
              id
              title
              approved
            }
          }
        }
      `, this.userToken, (error: any) => {
        console.log('error', error)
      });
      this._fireLocalAction('selectedSubjectId', subjectId)
      if(courseData.addToCourseSubject.subjectSubject.approved !== "YES"){
        this._fireLocalAction('customSubject', true)
      }else{
        this._fireLocalAction('customSubject', null)
      }
      this.loadLearningStructure();
      this.shadowRoot.querySelector('#subject-list').disabled = false;
      this.shadowRoot.querySelector('#create-discipline').close();
    }


    updateCourseDiscipline(e){
      //Setting this here because we don't want to show concepts that aren't aligned with a Subject. I assume this is the best way to do it?
      this.shadowRoot.querySelector('#subject-list').disabled = false;
      this.saveDisciplineToCourse(e.target.id);
      this._fireLocalAction('selectedDisciplineId', e.target.id)
      this._fireLocalAction('customSubject', false)
      this._fireLocalAction('subjects', this.learningStructure[e.model.index].subjects)
    }
    openCreateSubjectDialog(e){
      this.shadowRoot.querySelector('#create-subject').open();
    }
    updateCourseSubject(e){
      this.saveSubjectToCourse(e.target.id);
      this._fireLocalAction('selectedSubjectId', e.target.id)
    }
    async createSubject(){
      const data = await GQLMutate(`
          mutation {
              createSubject(
                  title: "${this.shadowRoot.querySelector('#subject-title').value}"
                  disciplineId: "${this.selectedDisciplineId}"
              ) {
                  id
                  title
              }
          }
      `, this.userToken, (error: any) => {
        console.log('error', error)
          alert(error);
      });
      // this.loadData()
      // this._fireLocalAction('subjects', [`${data.createSubject.id}`])
      const newSubjects = [...this.subjects, data.createSubject]
      this._fireLocalAction('subjects', newSubjects)
      this._fireLocalAction('customSubject', true)
      this._fireLocalAction('selectedSubjectId', data.createSubject.id)
      this.shadowRoot.querySelector('#create-subject').close();
    }
    async saveCourseSubject(e){
      const data = await GQLMutate(`
        mutation {
          addToCourseSubject(
            coursesCourseId: "${this.courseId}"
            subjectSubjectId: "${e.target.id}"
          ) {
            subjectSubject{
              title
              concepts{
                id
                title
              }
            }
          }
        }
      `, this.userToken, (error: any) => {
        console.log('error', error)
          alert(error);
      });
      this._fireLocalAction('selectedSubjectId', e.target.id)
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
                    discipline{
                      id
                      title
                      approved
                    }
                    subject{
                      id
                      title
                      approved
                    }
                }
            }
        `, this.userToken, (key: string, value: any) => {
        }, (error: any) => {
            console.log(error);
        });
        this._fireLocalAction('assignments', data.allAssignments)
        this._fireLocalAction('course', data.Course)
        this._fireLocalAction('customDiscipline', null)
        this._fireLocalAction('customSubject', null)
        if(data.Course && data.Course.discipline){
          this._fireLocalAction('selectedDisciplineId', data.Course.discipline.id)
          const learningStructureDiscipline = this.learningStructure.filter(function(discipline: Discipline){
            return discipline.id === data.Course.discipline.id
          })[0]
          this._fireLocalAction('subjects', learningStructureDiscipline.subjects)
          if(data.Course.discipline.approved !== "YES"){
            this._fireLocalAction('customDiscipline', true)
          }
        }
        if(data.Course && data.Course.subject){
          this._fireLocalAction('selectedSubjectId', data.Course.subject.id)
          if(data.Course.subject.approved !== "YES"){
            this._fireLocalAction('customSubject', true)
          }
        }
    }
    async titleChanged(e: any){
      if(typeof e.target !== 'undefined' && !e.target.invalid && this.course) {
        this._fireLocalAction('course', {
          ...this.course,
          title: e.target.value
        })
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
              id
              title
            }
          }
        }
      `, this.userToken, (key: string, value: any) => {
        this._fireLocalAction('learningStructure', value)
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
        if (Object.keys(state.components[this.componentId] || {}).includes('selectedDisciplineId')) this.selectedDisciplineId = state.components[this.componentId].selectedDisciplineId;
        if (Object.keys(state.components[this.componentId] || {}).includes('selectedSubjectId')) this.selectedSubjectId = state.components[this.componentId].selectedSubjectId;
        if (Object.keys(state.components[this.componentId] || {}).includes('customDiscipline')) this.customDiscipline = state.components[this.componentId].customDiscipline;
        if (Object.keys(state.components[this.componentId] || {}).includes('customSubject')) this.customSubject = state.components[this.componentId].customSubject;
//this.assignments = state[`assignmentsFromCourse${this.courseId}`];
        // this.course = state[`course${this.courseId}`];
        this.userToken = state.userToken;
        this.user = state.user;
    }
}

window.customElements.define(PrendusCourse.is, PrendusCourse);
