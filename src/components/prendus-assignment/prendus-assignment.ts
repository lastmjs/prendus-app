import {GQLrequest} from '../../services/graphql-service';
import {SetPropertyAction, SetComponentPropertyAction, DefaultAction} from '../../typings/actions';
import {ContainerElement} from '../../typings/container-element';
import {Assignment} from '../../typings/assignment';
import {Subject} from '../../typings/subject';
import {Concept} from '../../typings/concept';
import {User} from '../../typings/user';
import {createUUID} from '../../services/utilities-service';
import {sendStatement} from '../../services/analytics-service';
import {ContextType, NotificationType, QuestionType} from '../../services/constants-service';

class PrendusAssignment extends Polymer.Element implements ContainerElement {
  componentId: string;
  action: SetPropertyAction | SetComponentPropertyAction | DefaultAction;
  courseId: string;
  assignmentId: string;
  loaded: boolean;
  assignment: Assignment;
  userToken: string | null;
  user: User | null;
  learningStructure: any;
  subjects: Subject[];
  concepts: Concept[];
  selectedConcepts: Concept[];

  static get is() { return 'prendus-assignment'; }
  static get properties() {
    return {
      assignmentId: {
        observer: 'assignmentIdChanged'
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

  connectedCallback() {
    super.connectedCallback();
    this._fireLocalAction('loaded', true)
  }

  async assignmentIdChanged() {
    this._fireLocalAction('assignmentId', this.assignmentId)
    await this.loadData();
  }

  isEssayType(questionType: string): boolean {
    return questionType === 'ESSAY';
  }

  _questionTypes() {
    return Object.keys(QuestionType).map(key => {
      return {id: key, value: QuestionType[key]}
    })
  }

  openAssignmentConceptDialog(e: any){
    this.shadowRoot.querySelector('#assignmentConceptDialog').open();
  }

  removeAssignmentConcept(e){
    if(this.selectedConcepts.length === 1){
      alert('The Assignment needs at least 1 Concept')
    } else {
      const newSelectedConcepts = this.selectedConcepts.filter((concept) => {
        return e.model.item.id !== concept.id;
      })
      this._fireLocalAction('selectedConcepts', newSelectedConcepts);
    }
  }

  addConceptToAssignmentConcepts(e){
    const conceptInSelectedConcepts = this.selectedConcepts.filter((concept)=>{
      return concept.id === e.target.id
    })[0];
    if(!conceptInSelectedConcepts){
      const conceptToAddToAssignment = this.concepts.filter((concept)=>{
        return concept.id === e.target.id;
      })[0];
      const newSelectedConcepts = [...(this.selectedConcepts || []), conceptToAddToAssignment]
      this._fireLocalAction('selectedConcepts', newSelectedConcepts);
    }
  }

  closeAssignmentConceptDialog(e){
    this.shadowRoot.querySelector('#assignmentConceptDialog').close();
  }

  async createConcept(e){
    if(!this.shadowRoot.querySelector('#custom-concept').value){
      this.action = setNotification("Must enter a valid title for the new concept before adding it", NotificationType.ERROR)
      return;
    }
    const title = this.shadowRoot.querySelector('#custom-concept').value;
    const data = await GQLrequest(`
      mutation concept($title: String!, $subjectId: ID!) {
        createConcept(
          title: $title
          subjectId: $subjectId
        ){
          id
          title
          subject{
            concepts{
              id
              title
            }
          }
        }
      }
    `, {title, subjectId: this.assignment.course.subject.id}, this.userToken);
    this._fireLocalAction('concepts', data.createConcept.subject.concepts)
    this._fireLocalAction('selectedConcepts', [...(this.selectedConcepts || []), {id: data.createConcept.id, title: data.createConcept.title}]);
    this.shadowRoot.querySelector('#custom-concept').value = '';
  }

  async updateAssignmentConcepts(e: any){
    // const selectedConcepts = this.shadowRoot.querySelector('#courseConcepts').selectedItems
    const conceptsIds = this.selectedConcepts.map(concept => concept.id);
    const data = await GQLrequest(`
      mutation updateAssignmentAndConnectConcepts($conceptsIds: [ID!], $id: ID!) {
        updateAssignment(
          id: $id
          conceptsIds: $conceptsIds
        ) {
          id
          title,
          course {
              id
              subject{
                id
              }
          }
          concepts{
            id
            title
          }
        }
      }
    `, {conceptsIds, id: this.assignmentId}, this.userToken);
    this._fireLocalAction('assignment', data.updateAssignment)
    this.shadowRoot.querySelector('#assignmentConceptDialog').close();
  }

  async loadData() {
    const data = await GQLrequest(`
      query assignment($id: ID!) {
        Assignment(id: $id) {
          id
          title
          questionType
          create
          review
          grade
          take
          course {
              id
              subject{
                id
              }
          }
          concepts{
            id
            title
          }
        }
      }
    `, {id: this.assignmentId}, this.userToken);
    if (data.errors) {
      this.action = setNotification(data.errors[0].message, NotificationType.ERROR);
      return;
    }
    this.loadConcepts(data.Assignment.course.subject.id);
    this._fireLocalAction('assignment', data.Assignment)
    this._fireLocalAction('selectedConcepts', data.Assignment.concepts)
    this._fireLocalAction('courseId', data.Assignment.course.id)
  }

  async loadConcepts(subjectId: string){
    const conceptData = await GQLrequest(`
      query subject($subjectId: ID!) {
        Subject(id: $subjectId){
          id
          concepts{
            id
            title
          }
        }
      }
    `, {subjectId}, this.userToken);
    if (conceptData.errors) {
      this.action = setNotification(conceptData.errors[0].message, NotificationType.ERROR);
      return;
    }
    this._fireLocalAction('concepts', conceptData.Subject.concepts)
  }

  async saveData(e) {
    const questionType = this.shadowRoot.querySelector('#questionTypes').querySelector('paper-listbox').selected;
    const create = Number(this.shadowRoot.querySelector('#create').value);
    const review = Number(this.shadowRoot.querySelector('#review').value);
    const grade = this.assignment.questionType === 'ESSAY'
      ? Number(this.shadowRoot.querySelector('#review').value)
      : this.assignment.grade;
    const take = Number(this.shadowRoot.querySelector('#take').value);
    const title = this.shadowRoot.querySelector('#assignment-title').value;
    const data = await GQLrequest(`mutation saveAssignment(
        $questionType: QuestionType!
        $create: Int!
        $review: Int!
        $grade: Int!
        $take: Int!
        $title: String!
        $id: ID!
      ) {
          updateAssignment(
            id: $id
            questionType: $questionType
            create: $create
            review: $review
            grade: $grade
            take: $take
            title: $title
          ) {
            id
            title
            questionType
            create
            review
            grade
            take
            course {
                id
                subject{
                  id
                }
            }
            concepts{
              id
              title
            }
          }
      }`,
      {questionType, create, review, grade, take, title, id: this.assignment.id},
      this.userToken
    );
    if (data.errors) {
      this.action = setNotification(data.errors[0].message, NotificationType.ERROR);
      return;
    }
    this.loadConcepts(data.updateAssignment.course.subject.id);
    this._fireLocalAction('assignment', data.updateAssignment);
    this._fireLocalAction('selectedConcepts', data.updateAssignment.concepts);
    this._fireLocalAction('courseId', data.updateAssignment.course.id);
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    if (Object.keys(state.components[this.componentId] || {}).includes('loaded')) this.loaded = state.components[this.componentId].loaded;
    if (Object.keys(state.components[this.componentId] || {}).includes('connected')) this.connected = state.components[this.componentId].connected;
    if (Object.keys(state.components[this.componentId] || {}).includes('assignmentId')) this.assignmentId = state.components[this.componentId].assignmentId;
    if (Object.keys(state.components[this.componentId] || {}).includes('subjects')) this.subjects = state.components[this.componentId].subjects;
    if (Object.keys(state.components[this.componentId] || {}).includes('concepts')) this.concepts = state.components[this.componentId].concepts;
    if (Object.keys(state.components[this.componentId] || {}).includes('selectedConcepts')) this.selectedConcepts = state.components[this.componentId].selectedConcepts;
    if (Object.keys(state.components[this.componentId] || {}).includes('learningStructure')) this.learningStructure = state.components[this.componentId].learningStructure;
    if (Object.keys(state.components[this.componentId] || {}).includes('assignmentType')) this.assignmentType = state.components[this.componentId].assignmentType;
    if (Object.keys(state.components[this.componentId] || {}).includes('assignment')) this.assignment = state.components[this.componentId].assignment;
    if (Object.keys(state.components[this.componentId] || {}).includes('courseId')) this.courseId = state.components[this.componentId].courseId;
    this.userToken = state.userToken;
    this.user = state.user;
  }
}

window.customElements.define(PrendusAssignment.is, PrendusAssignment);
