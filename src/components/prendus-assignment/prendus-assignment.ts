import {GQLQuery, GQLMutate, GQLMutateWithVariables} from '../../services/graphql-service';
import {SetPropertyAction, SetComponentPropertyAction, DefaultAction} from '../../typings/actions';
import {ContainerElement} from '../../typings/container-element';
import {Assignment} from '../../typings/assignment';
import {Subject} from '../../typings/subject';
import {Concept} from '../../typings/concept';
import {User} from '../../typings/user';
import {checkForUserToken, getAndSetUser} from '../../redux/actions';
import {createUUID, navigate} from '../../services/utilities-service';
import {AssignmentType} from '../../typings/assignment-type';

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
    assignmentType: AssignmentType;
    connected: boolean;

    static get is() { return 'prendus-assignment'; }
    static get properties() {
        return {
            assignmentId: {
                observer: 'assignmentIdChanged'
            },
            courseId: {

            },
            mode: {

            },
            assignmentType: {
                observer: 'assignmentTypeChanged'
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
        this._fireLocalAction('connected', true)
        this._fireLocalAction('loaded', true)
    }

    isViewMode(mode: string) {
        return mode === 'view';
    }

    isEditMode(mode: string) {
        return mode === 'edit' || mode === 'create';
    }
    isCreateMode(mode: string) {
        return mode === 'create';
    }
    isResultMode(mode: string) {
        return mode === 'result';
    }
    async assignmentIdChanged() {
        this._fireLocalAction('assignmentId', this.assignmentId)
        await this.loadData();
    }

    assignmentTypeChanged() {
        this._fireLocalAction('assignmentType', this.assignmentType)
    }

    isCreateType(assignmentType: String) {
        return assignmentType === 'CREATE';
    }

    isReviewType(assignmentType: String) {
        return assignmentType === 'REVIEW';
    }
    isQuizType(assignmentType: String) {
        return assignmentType === 'QUIZ';
    }
    openAssignmentConceptDialog(e: any){
      this.shadowRoot.querySelector('#assignmentConceptDialog').open();
    }
    removeAssignmentConcept(e){
      if(this.selectedConcepts.length === 1){
        alert('The Assignment needs at least 1 Concept')
      }else{
        const newSelectedConcepts = this.selectedConcepts.filter((concept)=>{
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
        alert('Must enter a valid title for the new concept before adding it')
        return;
      }
      const newConcept = e.target;
      const customConcept = this.shadowRoot.querySelector('#custom-concept').value;
      const data = await GQLMutate(`
        mutation{
          createConcept(
            title: "${customConcept}"
            subjectId: "${this.assignment.course.subject.id}"
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
      `, this.userToken, (error: any) => {
          console.log(error);
      });
      this._fireLocalAction('concepts', data.createConcept.subject.concepts)
      this._fireLocalAction('selectedConcepts', [...(this.selectedConcepts || []), {id: data.createConcept.id, title: data.createConcept.title}]);
      this.shadowRoot.querySelector('#custom-concept').value = '';
    }
    async updateAssignmentConcepts(e: any){
      // const selectedConcepts = this.shadowRoot.querySelector('#courseConcepts').selectedItems
      const conceptIds = this.selectedConcepts.map((concept: Concept)=>{
        return `"${concept.id}"`
      })
      const variableString = `{"conceptsIds": [${conceptIds}]}`
      const data = await GQLMutateWithVariables(`
        mutation updateAssignmentAndConnectConcepts($conceptsIds: [ID!]) {
          updateAssignment(
            id: "${this.assignmentId}"
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
      `, this.userToken, variableString, (error: any) => {
          console.log(error);
      });
      this._fireLocalAction('assignment', data.updateAssignment)
      this.shadowRoot.querySelector('#assignmentConceptDialog').close();
    }
    async loadData() {
        const data = await GQLQuery(`
            query {
                Assignment(id: "${this.assignmentId}") {
                    id
                    title
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
        `, this.userToken, (key: string, value: any) => {},
          (error: any) => {
            console.log(error);
        });
        this.loadConcepts(data.Assignment.course.subject.id);
        this._fireLocalAction('assignment', data.Assignment)
        this._fireLocalAction('selectedConcepts', data.Assignment.concepts)
        this._fireLocalAction('courseId', data.Assignment.course.id)
    }
    async loadConcepts(subjectId: string){
        const conceptData = await GQLQuery(`
          query{
            Subject(id:"${subjectId}"){
              id
              concepts{
                id
                title
              }
            }
          }
        `, this.userToken, (key: string, value: any) => {
        }, (error: any) => {
            console.log(error);
        });
        this._fireLocalAction('concepts', conceptData.Subject.concepts)
    }
    // async saveAssignment() {
    //     const title = this.shadowRoot.querySelector('#titleInput').value;
    //     if(this.assignmentId){
    //       const data = await GQLMutate(`
    //         mutation {
    //             updateAssignment(
    //               id: "${this.assignmentId}"
    //               title: "${title}"
    //             ) {
    //                 id
    //             }
    //         }
    //       `, this.userToken, (error: any) => {
    //           console.log(error);
    //       });
    //     }else{
    //       if(title){
    //         this.createAssignment();
    //       }
    //     }
    //     navigate(`/course/${this.courseId}/edit`)
    // }
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
