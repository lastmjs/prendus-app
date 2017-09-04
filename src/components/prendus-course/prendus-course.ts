import {GQLRequest, GQLSubscribe} from '../../node_modules/prendus-shared/services/graphql-service';
import {ContainerElement} from '../../typings/container-element';
import {Mode} from '../../typings/mode';
import {Subject} from '../../typings/subject';
import {Discipline} from '../../typings/discipline';
import {SetPropertyAction, SetComponentPropertyAction, DefaultAction} from '../../typings/actions';
import {Assignment} from '../../typings/assignment';
import {Course} from '../../typings/course';
import {User} from '../../typings/user';
import {checkForUserToken, getAndSetUser, setNotification} from '../../redux/actions';
import {createUUID, navigate} from '../../node_modules/prendus-shared/services/utilities-service';
import {NotificationType, QuestionType} from '../../services/constants-service';

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
        this.resetCourseProperties();
        this._fireLocalAction('loaded', false)
        await this.loadLearningStructure();
        await this.loadData();
        this._fireLocalAction('loaded', true)
    }
    resetCourseProperties(){
      this._fireLocalAction('assignments', null)
      this._fireLocalAction('learningStructure', null)
      this._fireLocalAction('course', null)
      this._fireLocalAction('editingTitle', null)
      this._fireLocalAction('subjects', null)
      this._fireLocalAction('selectedDisciplineId', null)
      this._fireLocalAction('customDiscipline', null)
      this._fireLocalAction('customSubject', null)
      this._fireLocalAction('selectedDisciplineId', null)
    }

    isViewMode(mode: Mode) {
        this._fireLocalAction('loaded', true)
        return mode === 'view';
    }

    isEssayType(questionType: string): boolean {
      return questionType === QuestionType.ESSAY;
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
    cancelDisciplineDialog(e){
      //If I don't set it to null first, Polymer won't update the DOM. Anyone know why?
      this._fireLocalAction('selectedDisciplineId', null)
      this._fireLocalAction('selectedDisciplineId', this.course.discipline.id)
      this.shadowRoot.querySelector('#create-discipline').close();
    }
    cancelSubjectDialog(e){
      this._fireLocalAction('selectedSubjectId', null)
      this._fireLocalAction('selectedSubjectId', this.course.subject.id)
      this.shadowRoot.querySelector('#create-subject').close();
    }
    async createDiscipline(){
      const title = this.shadowRoot.querySelector('#discipline-title').value;
      const data = await GQLRequest(`
          mutation discipline($title: String!) {
              createDiscipline(
                  title: $title
              ) {
                  id
                  title
              }
          }
      `, {title}, this.userToken, (error: any) => {
        this.action = setNotification(error.message, NotificationType.ERROR)
      });
      //TODO combine this with the creatediscipline above
      this.saveDisciplineToCourse(data.createDiscipline.id);
      if(this.subjects){
        this._fireLocalAction('subjects', null);
      }
    }
    async saveDisciplineToCourse(disciplineId: string){
      const courseData = await GQLRequest(`
        mutation addDiscipline($courseId: ID!, $disciplineId: ID!) {
          addToCourseDiscipline(
            coursesCourseId: $courseId
            disciplineDisciplineId: $disciplineId
          ) {
            coursesCourse{
              id
              title
              discipline{
                id
                title
                approved
              }
            }
          }
        }
      `, {disciplineId, courseId: this.courseId}, this.userToken, (error: any) => {
          this.action = setNotification(error.message, NotificationType.ERROR)
      });
      if(this.course.subject){
        await GQLRequest(`
          mutation removeSubject($courseId: ID!, $subjectId: ID!) {
            removeFromCourseSubject(
              coursesCourseId: $courseId
              subjectSubjectId: $subjectId
            ) {
              coursesCourse{
                id
              }
            }
          }
        `, {courseId: this.courseId, subjectId: this.course.subject.id} this.userToken, (error: any) => {
          this.action = setNotification(error.message, NotificationType.ERROR)
        });
      }
      this._fireLocalAction('selectedDisciplineId', disciplineId)
      this._fireLocalAction('course', {
        ...this.course,
        discipline: courseData.addToCourseDiscipline.coursesCourse.discipline,
      })
      this._fireLocalAction('selectedSubjectId', null)
      this._fireLocalAction('customSubject', false)
      if(courseData.addToCourseDiscipline.coursesCourse.discipline.approved !== "YES"){
        this._fireLocalAction('customDiscipline', true)
      }else{
        this._fireLocalAction('customDiscipline', null)
      }

      this.loadLearningStructure();
      // this.shadowRoot.querySelector('#subject-list').disabled = false;
      this.shadowRoot.querySelector('#create-discipline').close();
      this.action = setNotification(`${courseData.addToCourseDiscipline.coursesCourse.discipline.title} is now the discipline of the course`, NotificationType.SUCCESS)
    }

    async saveSubjectToCourse(subjectId: string){
      const courseData = await GQLRequest(`
        mutation addSubject($courseId: ID!, $subjectId: ID!) {
          addToCourseSubject(
            coursesCourseId: $courseId
            subjectSubjectId: $subjectId
          ) {
            coursesCourse{
              id
              title
              subject{
                id
                title
                approved
              }
            }
          }
        }
      `, {subjectId, courseId: this.courseId}, this.userToken, (error: any) => {
        this.action = setNotification(error.message, NotificationType.ERROR)
      });
      this._fireLocalAction('selectedSubjectId', subjectId)
      this._fireLocalAction('course', {
        ...this.course,
        subject: courseData.addToCourseSubject.coursesCourse.subject,
      })
      if(courseData.addToCourseSubject.coursesCourse.subject.approved !== "YES"){
        this._fireLocalAction('customSubject', true)
      }else{
        this._fireLocalAction('customSubject', null)
      }
      this.loadLearningStructure();
      // this.shadowRoot.querySelector('#subject-list').disabled = false;
      this.shadowRoot.querySelector('#create-discipline').close();
      this.action = setNotification(`${courseData.addToCourseSubject.coursesCourse.subject.title} is now the subject of the course`, NotificationType.SUCCESS)
    }
    updateCourseDiscipline(e){
      //Setting this here because we don't want to show concepts that aren't aligned with a Subject. I assume this is the best way to do it?
      // this.shadowRoot.querySelector('#subject-list').disabled = false;
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
      const title = this.shadowRoot.querySelector('#subject-title').value;
      const disciplineId = this.selectedDisciplineId;
      const data = await GQLRequest(`
          mutation subject($title: String!, $disciplineId: ID!) {
              createSubject(
                  title: $title
                  disciplineId: $disciplineId
              ) {
                  id
                  title
              }
          }
      `, {title, disciplineId}, this.userToken, (error: any) => {
          this.action = setNotification(error.message, NotificationType.ERROR)
      });
      this.saveSubjectToCourse(data.createSubject.id);
      const newSubjects = [...(this.subjects || []), data.createSubject];
      this._fireLocalAction('subjects', newSubjects)
      this._fireLocalAction('customSubject', true)
      this._fireLocalAction('selectedSubjectId', data.createSubject.id)
      this.shadowRoot.querySelector('#create-subject').close();
      // this.action = setNotification("Subject created", NotificationType.SUCCESS)
    }
    getLTILinks(e){
      this.shadowRoot.querySelector(`#assignment-lti-links-modal${e.model.item.id}`).open();
    }
    getEditIcon(editStatus: boolean): string {
      return editStatus ? 'check' : 'create';
    }
    openCreateAssignmentModal(e){
      this.shadowRoot.querySelector('#assignment-title').value = null;
      if(this.course.discipline && this.course.subject){
        this.shadowRoot.querySelector('#create-assignment').open();
      }else{
        this.action = setNotification("Select a discipline and subject before creating any assignments", NotificationType.WARNING)
      }
    }
    async createAssignment(){
      const assignmentTitle = this.shadowRoot.querySelector('#assignment-title').value;
      // const conceptTitle = this.shadowRoot.querySelector('#concept-title').value;
      if(assignmentTitle){
        const data = await GQLRequest(`
          mutation assignment($assignmentTitle: String!, $userId: ID, $courseId: ID!) {
            createAssignment(
              title: $assignmentTitle
              authorId: $userId
              courseId: $courseId
            ){
              id
            }
          }
        `, {assignmentTitle, userId: (this.user ? this.user.id : null), courseId: this.courseId},
          this.userToken, (error: any) => {
            this.action = setNotification(error.message, NotificationType.ERROR)
        });
        this.shadowRoot.querySelector('#create-assignment').close();
        // navigate(`assignment/${data.createAssignment.id}/edit`)
      }else{
        setNotification("Input a title to add Assignment", NotificationType.WARNING)
      }
      // href=""
    }
    async deleteAssignment(e){
      const data = await GQLRequest(`
          mutation delete($id: ID!) {
              deleteAssignment(id: $id){
                id
              }
          }
      `, {id: e.model.item.id}, this.userToken, (error: any) => {
          this.action = setNotification(error.message, NotificationType.ERROR)
      });
      this.loadData();
    }
    async loadData() {
        const data = await GQLRequest(`
            query getAssignments($courseId: ID!) {
                allAssignments(filter: {
                    course: {
                        id: $courseId
                    }
                }) {
                    id
                    title
                    questionType
                }
                Course(id: $courseId) {
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
        `, {courseId: this.courseId}, this.userToken, (error: any) => {
            this.action = setNotification(error.message, NotificationType.ERROR)
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
            if (this.courseId)
              this.loadData();
        });
    }
    async loadLearningStructure(){
      const data = await GQLRequest(`
        query getLearningStructure($courseId: ID!) {
          allDisciplines(
            first: 25
            filter: {
              OR: [{
                  courses_some: {
                  id: $courseId
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
      `, {courseId: this.courseId}, this.userToken, (error: any) => {
          setNotification(error.message, NotificationType.ERROR)
      });
      this._fireLocalAction('learningStructure', data.allDisciplines);
    }
    createDisciplineOnEnter(e: any){
      if(e.keyCode === 13 && this.shadowRoot.querySelector(`#${e.target.id}`).value) this.createDiscipline();
    }
    createSubjectOnEnter(e: any){
      if(e.keyCode === 13 && this.shadowRoot.querySelector(`#${e.target.id}`).value) this.createSubject();
    }
    createAssignmentOnEnter(e: any){
      if(e.keyCode === 13 && this.shadowRoot.querySelector(`#${e.target.id}`).value) this.createAssignment();
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
