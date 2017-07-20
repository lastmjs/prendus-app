import {GQLQuery, GQLMutate} from '../../services/graphql-service.js';
import {SetPropertyAction, SetComponentPropertyAction, DefaultAction} from '../../typings/actions.js';
import {ContainerElement} from '../../typings/container-element.js';
import {Assignment} from '../../typings/assignment.js';
import {Subject} from '../../typings/subject.js';
import {Concept} from '../../typings/concept.js';
import {User} from '../../typings/user.js';
import {checkForUserToken, getAndSetUser} from '../../redux/actions.js';
import {createUUID, navigate} from '../../services/utilities-service.js';
import {AssignmentType} from '../../typings/assignment-type.js';

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

    showSubjects(e){
      //Setting this here because we don't want to show concepts that aren't aligned with a Subject. I assume this is the best way to do it?
      if(this.concepts){
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'concepts',
            value: ''
        };
      }
      this.action = {
          type: 'SET_COMPONENT_PROPERTY',
          componentId: this.componentId,
          key: 'subjects',
          value: this.learningStructure[e.target.id].subjects
      };
    }
    showConcepts(e){
      this.action = {
          type: 'SET_COMPONENT_PROPERTY',
          componentId: this.componentId,
          key: 'concepts',
          value: this.subjects[e.target.id].concepts
      };
    }
    openAssignmentConceptDialog(e: any){
      if(!this.learningStructure){
        //TODO Make it so that we listen for changes to the learningStructure.
        this.loadLearningStructure();
      }
      this.shadowRoot.querySelector('#assignmentConceptDialog').open();
    }
    closeAssignmentConceptDialog(e){
      this.shadowRoot.querySelector('#assignmentConceptDialog').close();
    }
    async saveConcept(e: any){
      const selectedConcept = this.concepts[e.target.id]
      if(!this.assignmentId){
        await this.createAssignment();
      }
      const data = await GQLMutate(`
      mutation {
        addToAssignmentOnConcepts(
          assignmentsAssignmentId: "${this.assignmentId}"
          conceptsConceptId: "${selectedConcept.id}"
        ) {
          assignmentsAssignment{
            title
          }
          conceptsConcept{
            title
          }
        }
      }
      `, this.userToken, (error: any) => {
          console.log(error);
      });
      //TODO. This needs to be optimized.
      this.loadData();
      this.shadowRoot.querySelector('#assignmentConceptDialog').close();
    }
    async loadData() {
        await GQLQuery(`
            query {
                Assignment(id: "${this.assignmentId}") {
                    title,
                    course {
                        id
                    }
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
    async loadLearningStructure(){
      await GQLQuery(`
          query {
              learningStructure: allDisciplines(first: 30) {
                title
                subjects{
                  title
                  concepts{
                    id
                    title
                  }
                }
              }
          }
      `, this.userToken, (key: string, value: any) => {
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
