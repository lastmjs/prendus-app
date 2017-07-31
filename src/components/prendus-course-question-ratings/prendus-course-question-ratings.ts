import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {GQLQuery, GQLMutate} from '../../services/graphql-service';
import {ContainerElement} from '../../typings/container-element';
import {User} from '../../typings/user';
import {Assignment} from '../../typings/assignment';
import {QuestionRating} from '../../typings/question-rating';
import {Question} from '../../typings/question';
import {Concept} from '../../typings/concept';
import {createUUID} from '../../services/utilities-service';
import {parse} from '../../node_modules/assessml/assessml';

class PrendusCourseQuestionRatings extends Polymer.Element {
  loaded: boolean;
  action: SetPropertyAction | SetComponentPropertyAction;
  componentId: string;
  userToken: string | null;
  user: User;
  courseId: string;
  assignments: Assignment[];
  assignmentId: string;
  conceptId: string;

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
  }

  _fireAction(key: string, value: any) {
    this.action = {
      type: 'SET_COMPONENT_PROPERTY',
      componentId: this.componentId,
      key,
      value
    };
  }

  async connectedCallback() {
    super.connectedCallback();
    this._fireAction('loaded', true);
  }

  _handleError(error: any) {
    console.log('error', error);
  }

  async loadQuestions() {
    const data = GQLQuery(`
        query {
          assignments: allAssignments(
            filter:{
              course: {
                id: "${this.courseId}"
              }
          }) {
            id
            title
            questions {
              id
              text
              concept {
                id
                title
              }
              ratings {
                alignment
                difficulty
                quality
              }
            }
          }
        }
    `, this.userToken,
      (key: string, value: any) => { this._fireAction(key, value) },
      this._handleError);
  }

  async _courseIdChanged() {
    this._fireAction('courseId', this.courseId);
    this._fireAction('loaded', false);
    await this.loadQuestions();
    this._fireAction('loaded', true);
  }

  _applyFilter(assignments: Assignment[], assignmentId: string, conceptId: string): Question[] {
    if (!assignments) return [];
    const filteredAssignments = !assignmentId || assignmentId === 'ALL'
      ? assignments
      : assignments.filter(filterProp('id', assignmentId));
    const questions: Question[] = flatten(filteredAssignments.map(assignment => assignment.questions));
    return !conceptId || conceptId === 'ALL'
      ? questions
      : questions.filter(question => question.concept.id === conceptId);
  }

  _assignmentIdChanged(e) {
    this._fireAction('assignmentId', e.target.value);
  }

  _conceptIdChanged(e) {
    this._fireAction('conceptId', e.target.value);
  }

  _concepts(assignments: Assignment[]): Concept[] {
    return uniqueProp(
      flatten(assignments.map(assignment => assignment.questions)).map(question => question.concept),
      'id'
    );
  }

  _questionOnly(text: string): string {
    return parse(text).ast[0].content.replace('<p>', '').replace('</p><p>', '');
  }

  _averageProp = averageProp;

  _questionScore(ratings: QuestionRating[]): number {
    return (this._averageProp(ratings, 'alignment') + this._averageProp(ratings, 'quality') + this._averageProp(ratings, 'difficulty')) / 3;
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    const keys = Object.keys(componentState);
    if (keys.includes('assignments')) this.assignments = componentState.assignments;
    if (keys.includes('courseId')) this.courseId = componentState.courseId;
    if (keys.includes('loaded')) this.loaded = componentState.loaded;
    if (keys.includes('assignmentId')) this.assignmentId = componentState.assignmentId;
    if (keys.includes('conceptId')) this.conceptId = componentState.conceptId;
    this.userToken = state.userToken;
    this.user = state.user;
    console.log('state changed', state);
  }
}

function flatten(arr: any[]): any[] {
  return arr.reduce((acc, elem) => {
    return acc.concat(Array.isArray(elem) ? flatten(elem) : elem);
  },[]);
}

function filterProp(prop: string, val: string): (obj: Object) => boolean {
  return obj => obj[prop] === val;
}

function averageProp(arr: Object[], prop: string): number {
  if (!arr.length) return 0;
  return arr.reduce((sum, obj) => sum + obj[prop], 0) / arr.length;
}

function uniqueProp(arr: Object[], prop: string): Object[] {
  return arr.reduce((filtered: Object[], obj: Object) => {
    if (filtered.filter(filterProp(prop, obj[prop])).length === 0)
      filtered.push(obj);
    return filtered;
  }, []);
}

window.customElements.define(PrendusCourseQuestionRatings.is, PrendusCourseQuestionRatings);
