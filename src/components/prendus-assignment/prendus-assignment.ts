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

    async connectedCallback() {
        super.connectedCallback();

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'connected',
            value: true
        };

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: true
        };
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
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'assignmentId',
            value: this.assignmentId
        };
        await this.loadData();
    }

    assignmentTypeChanged() {
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'assignmentType',
            value: this.assignmentType
        };
    }

    isCreateType(assignmentType: String) {
        return assignmentType === 'CREATE';
    }

    isReviewType(assignmentType: String) {
        return assignmentType === 'REVIEW';
    }
    openAssignmentConceptDialog(e: any){
      //THIS WAS INTENDED TO SELECT THE CURRENT CONCEPTS. THERE IS A WEIRD ERROR THAT IF THE CONCEPTS ARE EDITED AND THEN THE MODAL IS OPENED AGAIN IT WONT SELECT THE CONCEPTS. LEAVING THIS HERE UNTIL WE CAN FIGURE IT OUT
      // const conceptIds = this.assignment.concepts.map(function(concept:Concept){
      //    return concept.id
      // })
      // const that = this;
      // this.concepts.map(function(subjectConcept: Concept, index: number){
      //   that.assignment.concepts.map(function(assignmentConcept: Concept){
      //     if(subjectConcept.id === assignmentConcept.id){
      //       that.shadowRoot.querySelector('#courseConcepts').selectIndex(index)
      //     }
      //   })
      // })
      this.shadowRoot.querySelector('#assignmentConceptDialog').open();
    }
    closeAssignmentConceptDialog(e){
      this.shadowRoot.querySelector('#assignmentConceptDialog').close();
    }
    async saveConcept(e){
      const newConcept = e.target;
      const customConcept = this.shadowRoot.querySelector('#custom-concept').value;
      const data = await GQLMutate(`
        mutation{
          createConcept(
            title: "${customConcept}"
            subjectId: "${this.assignment.course.subject.id}"
          ){
            id
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
      this.action = {
          type: 'SET_COMPONENT_PROPERTY',
          componentId: this.componentId,
          key: 'concepts',
          value: data.createConcept.subject.concepts
      };
      this.shadowRoot.querySelector('#custom-concept').value = '';
    }
    async updateAssignmentConcepts(e: any){
      const selectedConcepts = this.shadowRoot.querySelector('#courseConcepts').selectedItems
      const conceptIds = selectedConcepts.map(function(concept: Concept){
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
      this.action = {
          type: 'SET_COMPONENT_PROPERTY',
          componentId: this.componentId,
          key: 'assignment',
          value: data.updateAssignment
      };
      this.shadowRoot.querySelector('#assignmentConceptDialog').close();
    }
    async loadData() {
        await GQLQuery(`
            query {
                Assignment(id: "${this.assignmentId}") {
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
        `, this.userToken, (key: string, value: any) => {
            this.loadConcepts(value.course.subject.id);
            this.action = {
                type: 'SET_COMPONENT_PROPERTY',
                componentId: this.componentId,
                key: 'assignment',
                value
            };
            this.action = {
                type: 'SET_COMPONENT_PROPERTY',
                componentId: this.componentId,
                key: 'courseId',
                value: value.course.id
            };
        }, (error: any) => {
            console.log(error);
        });
    }
    async loadConcepts(subjectId: string){
        await GQLQuery(`
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
          this.action = {
              type: 'SET_COMPONENT_PROPERTY',
              componentId: this.componentId,
              key: 'concepts',
              value: value.concepts
          };
        }, (error: any) => {
            console.log(error);
        });
    }
    async createAssignment(){
      const title = this.shadowRoot.querySelector('#titleInput').value;
      const data = await GQLMutate(`
        mutation {
            createAssignment(
              title: "${title}"
              authorId: "${this.user ? this.user.id : null}"
              courseId: "${this.courseId}"
            ) {
                id
            }
        }
      `, this.userToken, (error: any) => {
          console.log(error);
      });
      this.action = {
          type: 'SET_COMPONENT_PROPERTY',
          componentId: this.componentId,
          key: 'assignmentId',
          value: data.createAssignment.id
      };
    }
    async saveAssignment() {
        const title = this.shadowRoot.querySelector('#titleInput').value;
        if(this.assignmentId){
          const data = await GQLMutate(`
            mutation {
                updateAssignment(
                  id: "${this.assignmentId}"
                  title: "${title}"
                ) {
                    id
                }
            }
          `, this.userToken, (error: any) => {
              console.log(error);
          });
        }else{
          if(title){
            this.createAssignment();
          }
        }
        navigate(`/course/${this.courseId}/edit`)
    }
    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        if (Object.keys(state.components[this.componentId] || {}).includes('loaded')) this.loaded = state.components[this.componentId].loaded;
        if (Object.keys(state.components[this.componentId] || {}).includes('connected')) this.connected = state.components[this.componentId].connected;
        if (Object.keys(state.components[this.componentId] || {}).includes('assignmentId')) this.assignmentId = state.components[this.componentId].assignmentId;
        if (Object.keys(state.components[this.componentId] || {}).includes('subjects')) this.subjects = state.components[this.componentId].subjects;
        if (Object.keys(state.components[this.componentId] || {}).includes('concepts')) this.concepts = state.components[this.componentId].concepts;
        if (Object.keys(state.components[this.componentId] || {}).includes('learningStructure')) this.learningStructure = state.components[this.componentId].learningStructure;
        if (Object.keys(state.components[this.componentId] || {}).includes('assignmentType')) this.assignmentType = state.components[this.componentId].assignmentType;
        if (Object.keys(state.components[this.componentId] || {}).includes('assignment')) this.assignment = state.components[this.componentId].assignment;
        if (Object.keys(state.components[this.componentId] || {}).includes('courseId')) this.courseId = state.components[this.componentId].courseId;
        this.userToken = state.userToken;
        this.user = state.user;
    }
}

window.customElements.define(PrendusAssignment.is, PrendusAssignment);
