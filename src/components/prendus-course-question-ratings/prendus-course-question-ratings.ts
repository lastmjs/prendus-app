import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {GQLQuery, GQLMutate} from '../../services/graphql-service';
import {ContainerElement} from '../../typings/container-element';
import {User} from '../../typings/user';
import {Assignment} from '../../typings/assignment';
import {createUUID} from '../../services/utilities-service';
import {parse} from '../../node_modules/assessml/assessml';

class PrendusCourseQuestionRatings extends Polymer.Element {
  action: SetPropertyAction | SetComponentPropertyAction;
  componentId: string;
  userToken: string | null;
  user: User;
  assignments: Assignment[];
  filter: { [key: string]: string } = {
    'assignmentId': 'ALL',
    'conceptId': 'ALL'
  };

  static get is() { return 'prendus-course-question-ratings'; }

  static get properties() {
    return {
      courseId: {
        observer: '_courseIdChanged'
      }
    }
  }

  constructor() {
    super();
    this.componentId = createUUID();
    console.log('constructed');
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

  _handleError(error: any) {
    console.log('error', error);
  }
  
  async loadQuestions() {
    const data = GQLQuery(`
        query {
          allAssignments(
            filter:{
              course: {
                id: "${this.courseId}"
              }
          }) {
            id
            title
            concepts {
              subject {
                title
              }
              id
              title
            }
            questions {
              id
              text
              ratings {
                alignment
                difficulty
                quality
              }
            }
          }
        }
    `, this.userToken,
      (key: string, value: any) => {
        this.action = {
          type: 'SET_COMPONENT_PROPERTY',
          componentId: this.componentId,
          key: 'assignments',
          value: value
        };
      },
      this._handleError);
  }

  async _courseIdChanged() {
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
      
      await this.loadQuestions();

      this.action = {
          type: 'SET_COMPONENT_PROPERTY',
          componentId: this.componentId,
          key: 'loaded',
          value: true
      };
  }

  _flatten(arr: any[]) {
    return arr.reduce((acc, elem) => {
      if (Array.isArray(elem)) this._flatten(elem).forEach((el) => acc.push(el));
      else acc.push(elem);
      return acc;
    },[]);
  }

  _applyFilter(assignments, filter) {
    if (!assignments) return;
    let filtered = this._flatten(assignments.map(assignment => assignment.questions));
    console.log(filtered);
    return filtered;
  }

  _questionOnly(text: string) {
    console.log(text);
    return parse(text).ast[0].content.replace('<p>', '').replace('</p><p>', '');
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    if (Object.keys(state.components[this.componentId] || {}).includes('assignments')) this.assignments = state.components[this.componentId].assignments;
    if (Object.keys(state.components[this.componentId] || {}).includes('courseId')) this.courseId = state.components[this.componentId].courseId;
    if (Object.keys(state.components[this.componentId] || {}).includes('loaded')) this.loaded = state.components[this.componentId].loaded;
    this.userToken = state.userToken;
    this.user = state.user;
    console.log('state changed', state);
  }
}

window.customElements.define(PrendusCourseQuestionRatings.is, PrendusCourseQuestionRatings);
