import {GQLRequest} from '../../node_modules/prendus-shared/services/graphql-service';
import {setNotification, checkForUserToken, getAndSetUser} from '../../redux/actions';
import {createUUID, navigate} from '../../services/utilities-service';
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
  connected: boolean;
  assignmentType: string;

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

  _handleGQLError(err: any) {
    this.action = setNotification(err.message, NotificationType.ERROR);
  }

  connectedCallback() {
    super.connectedCallback();
    this._fireLocalAction('loaded', true)
  }

  async assignmentIdChanged() {
    this._fireLocalAction('assignmentId', this.assignmentId)
    this.action = checkForUserToken();
    this.action = await getAndSetUser();

    if (!this.user) {
        navigate('/authenticate');
        return;
    }

    await this.loadData();
  }
  async getCourseId() {
      const data = await GQLRequest(`
          query getCourseId($id: ID!) {
              Assignment(id: $id) {
                  id
                  course {
                      id
                  }
              }
          }
        `,
        {id: this.assignmentId},
        this.userToken,
        this._handleGQLError.bind(this)
      );
      this._fireLocalAction('courseId', data.Assignment.course.id)
  }
  isEssayType(questionType: string): boolean {
    return questionType === 'ESSAY';
  }

  _questionTypes() {
    return Object.keys(QuestionType).map(key => {
      return {id: key, value: QuestionType[key]}
    })
  }
  continueToHome(){
    this.shadowRoot.querySelector("#unauthorizedAccessModal").close()
    navigate('/');
  }
  openAssignmentConceptDialog(e: any){
    this.shadowRoot.querySelector('#assignmentConceptDialog').open();
  }

  removeAssignmentConcept(e){
    const newSelectedConcepts = this.selectedConcepts.filter((concept) => {
      return e.model.item.id !== concept.id;
    })
    this._fireLocalAction('selectedConcepts', newSelectedConcepts);
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
    const data = await GQLRequest(`
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
    `, {title, subjectId: this.assignment.course.subject.id}, this.userToken, this._handleGQLError.bind(this));
    this._fireLocalAction('concepts', data.createConcept.subject.concepts)
    this._fireLocalAction('selectedConcepts', [...(this.selectedConcepts || []), {id: data.createConcept.id, title: data.createConcept.title}]);
    this.shadowRoot.querySelector('#custom-concept').value = '';
  }

  async updateAssignmentConcepts(e: any){
    // const selectedConcepts = this.shadowRoot.querySelector('#courseConcepts').selectedItems
    const conceptsIds = this.selectedConcepts.map(concept => concept.id);
    const assignmentTitle = this.shadowRoot.querySelector('#assignment-title').value
    const data = await GQLRequest(`
      mutation updateAssignmentAndConnectConcepts($conceptsIds: [ID!], $id: ID!, $assignmentTitle: String!) {
        updateAssignment(
          id: $id
          conceptsIds: $conceptsIds
          title: $assignmentTitle
        ) {
          id
          concepts{
            id
            title
          }
        }
      }
    `, {conceptsIds, id: this.assignmentId, assignmentTitle}, this.userToken, this._handleGQLError.bind(this));
    this._fireLocalAction('assignment', {
      ...this.assignment,
      concepts: data.updateAssignment.concepts
    })
    this.shadowRoot.querySelector('#assignmentConceptDialog').close();
  }

  async loadData() {
    this._fireLocalAction('loaded', false)
    const data = await GQLRequest(`
      query assignment($id: ID!) {
        Assignment(id: $id) {
          id
          title
          questionType
          numCreateQuestions
          numReviewQuestions
          numGradeResponses
          numResponseQuestions
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
    `, {id: this.assignmentId}, this.userToken, this._handleGQLError.bind(this));
    this.loadConcepts(data.Assignment.course.subject.id);
    this._fireLocalAction('assignment', data.Assignment)
    this._fireLocalAction('selectedConcepts', data.Assignment.concepts)
    this._fireLocalAction('courseId', data.Assignment.course.id)
    this._fireLocalAction('loaded', true)
  }

  async loadConcepts(subjectId: string){
    const conceptData = await GQLRequest(`
      query subject($subjectId: ID!) {
        Subject(id: $subjectId){
          id
          concepts{
            id
            title
          }
        }
      }
    `, {subjectId}, this.userToken, this._handleGQLError.bind(this));
    this._fireLocalAction('concepts', conceptData.Subject.concepts)
  }

  async saveData(e) {
    const questionType = this.shadowRoot.querySelector('#questionTypes').querySelector('paper-listbox').selected;
    const numCreateQuestions = Number(this.shadowRoot.querySelector('#create').value);
    const numReviewQuestions = Number(this.shadowRoot.querySelector('#review').value);
    const numGradeResponses = this.assignment.questionType === 'ESSAY'
      ? Number(this.shadowRoot.querySelector('#grade').value)
      : this.assignment.numGradeResponses;
    const numResponseQuestions = Number(this.shadowRoot.querySelector('#take').value);
    const title = this.shadowRoot.querySelector('#assignment-title').value;
    const data = await GQLRequest(`mutation saveAssignment(
        $questionType: QuestionType!
        $numCreateQuestions: Int!
        $numReviewQuestions: Int!
        $numGradeResponses: Int!
        $numResponseQuestions: Int!
        $title: String!
        $id: ID!
      ) {
          updateAssignment(
            id: $id
            questionType: $questionType
            numCreateQuestions: $numCreateQuestions
            numReviewQuestions: $numReviewQuestions
            numGradeResponses: $numGradeResponses
            numResponseQuestions: $numResponseQuestions
            title: $title
          ) {
            id
            title
            questionType
            numCreateQuestions
            numReviewQuestions
            numGradeResponses
            numResponseQuestions
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
      {questionType, numCreateQuestions, numReviewQuestions, numGradeResponses, numResponseQuestions, title, id: this.assignment.id},
      this.userToken,
      this._handleGQLError.bind(this)
    );
    this.loadConcepts(data.updateAssignment.course.subject.id);
    this._fireLocalAction('assignment', data.updateAssignment);
    this._fireLocalAction('selectedConcepts', data.updateAssignment.concepts);
    this._fireLocalAction('courseId', data.updateAssignment.course.id);
    this.action = setNotification("Assignment Updated", NotificationType.SUCCESS);
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
