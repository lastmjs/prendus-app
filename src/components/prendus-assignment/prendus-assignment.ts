import {GQLQuery, GQLMutate} from '../../services/graphql-service';
import {SetPropertyAction, SetComponentPropertyAction, DefaultAction} from '../../typings/actions';
import {ContainerElement} from '../../typings/container-element';
import {Assignment} from '../../typings/assignment';
import {Subject} from '../../typings/subject';
import {Concept} from '../../typings/concept';
import {User} from '../../typings/user';
import {checkForUserToken, getAndSetUser} from '../../redux/actions';
import {createUUID} from '../../services/utilities-service';

class PrendusAssignment extends Polymer.Element implements ContainerElement {
    componentId: string;
    action: SetPropertyAction | SetComponentPropertyAction | DefaultAction;
    lessonId: string;
    assignmentId: string;
    loaded: boolean;
    assignment: Assignment;
    userToken: string | null;
    user: User | null;
    learningStructure: any;
    subjects: Subject[];
    concepts: Concept[];

    static get is() { return 'prendus-assignment'; }
    static get properties() {
        return {
            assignmentId: {
                observer: 'assignmentIdChanged'
            },
            lessonId: {

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
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: true
        };
        super.connectedCallback();
    }

    isViewMode(mode) {
        return mode === 'view';
    }

    isEditMode(mode) {
        return mode === 'edit' || mode === 'create';
    }

    async assignmentIdChanged() {
        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'assignmentId',
            value: this.assignmentId
        };

        await this.loadData();
        await this.loadLearningStructure();
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
    async saveConcept(e: any){
      const selectedConcept = this.concepts[e.target.id]
      const data = await GQLMutate(`
      mutation {
        updateAssignment(
          id: "${this.assignmentId}"
          conceptsIds: "${selectedConcept.id}"
        ) {
          id
        }
      }
      `, this.userToken, (error: any) => {
          console.log(error);
      });
    }
    async loadData() {
        await GQLQuery(`
            query {
                assignment${this.assignmentId}: Assignment(id: "${this.assignmentId}") {
                    title,
                    lesson {
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
                type: 'SET_PROPERTY',
                key,
                value
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
              type: 'SET_PROPERTY',
              key,
              value
          };
      }, (error: any) => {
          console.log(error);
      });
    }

    async saveAssignment() {
        const title = this.shadowRoot.querySelector('#titleInput').value;

        const data = await GQLMutate(`
            mutation {
                createAssignment(
                  title: "${title}"
                  lessonId: "${this.lessonId}"
                  authorId: "${this.user ? this.user.id : null}"
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
    stateChange(e: CustomEvent) {
        const state = e.detail.state;
        if (Object.keys(state.components[this.componentId] || {}).includes('loaded')) this.loaded = state.components[this.componentId].loaded;
        if (Object.keys(state.components[this.componentId] || {}).includes('assignmentId')) this.assignmentId = state.components[this.componentId].assignmentId;
        if (Object.keys(state.components[this.componentId] || {}).includes('subjects')) this.subjects = state.components[this.componentId].subjects;
        if (Object.keys(state.components[this.componentId] || {}).includes('concepts')) this.concepts = state.components[this.componentId].concepts;
        if (Object.keys(state.components[this.componentId] || {}).includes('learningStructure')) this.learningStructure = state.components[this.componentId].learningStructure;
        this.assignment = state[`assignment${this.assignmentId}`];
        this.lessonId = this.assignment ? this.assignment.lesson.id : this.lessonId;
        this.userToken = state.userToken;
        this.user = state.user;
    }
}

window.customElements.define(PrendusAssignment.is, PrendusAssignment);
