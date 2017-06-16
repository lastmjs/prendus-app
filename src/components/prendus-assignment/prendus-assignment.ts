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
    selectedConcept: Concept;

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
        super.connectedCallback();

        this.action = {
            type: 'SET_COMPONENT_PROPERTY',
            componentId: this.componentId,
            key: 'loaded',
            value: true
        };
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
    getSubject(e){
      this.subjects = this.learningStructure[e.target.id].subjects
      //This is Polymer. I'm doing it to update subjects on the DOM when a discipline is seletcted
      this.notifySplices('subjects', [
        { index: 1, added: [this.learningStructure[e.target.id].subjects[0]], addedCount: this.subjects.length, obect: this.subjects, type: 'splice' },
      ]);
    }
    getConcept(e){
      this.concepts = this.subjects[e.target.id].concepts
      this.notifySplices('concepts', [
        { index: 1, added: [this.subjects[e.target.id].concepts[0]], addedCount: this.concepts.length, obect: this.concepts, type: 'splice' },
      ]);
    }
    async saveConcept(e: any){
      this.selectedConcept = this.concepts[e.target.id]
      const data = await GQLMutate(`
      mutation {
        updateAssignment(
          id: "${this.assignmentId}"
          conceptsIds: "${this.selectedConcept.id}"
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
        this.learningStructure = state[`learningStructure`];
        if (Object.keys(state.components[this.componentId] || {}).includes('loaded')) this.loaded = state.components[this.componentId].loaded;
        if (Object.keys(state.components[this.componentId] || {}).includes('assignmentId')) this.assignmentId = state.components[this.componentId].assignmentId;
        this.assignment = state[`assignment${this.assignmentId}`];
        this.lessonId = this.assignment ? this.assignment.lesson.id : this.lessonId;
        this.userToken = state.userToken;
        this.user = state.user;
    }
}

window.customElements.define(PrendusAssignment.is, PrendusAssignment);
