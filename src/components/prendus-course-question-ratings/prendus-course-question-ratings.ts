import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {GQLQuery, GQLMutate} from '../../services/graphql-service';
import {ContainerElement} from '../../typings/container-element';
import {User} from '../../typings/user';
import {Assignment} from '../../typings/assignment';
import {QuestionRating, QuestionRatingStats} from '../../typings/question-rating';
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
  questionStats: QuestionRatingStats[];
  assignmentId: string = 'ALL';
  conceptId: string = 'ALL';
  sortField: string = 'overall';
  sortAsc: boolean = false;

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

  _assignmentIdChanged(e) {
    this._fireAction('assignmentId', e.target.value);
  }

  _conceptIdChanged(e) {
    this._fireAction('conceptId', e.target.value);
  }

  _questions(assignments: Assignment[]): Question[] {
    return flatten(assignments.map(assignment => assignment.questions));
  }

  _makeFilter(assignmentId: string, conceptId: string): (question: QuestionRatingStats) => boolean {
    return (question: QuestionRatingStats) => {
      return (assignmentId === 'ALL' || question.assignmentId === assignmentId)
      && (conceptId === 'ALL' || conceptId === question.conceptId);
    };
  }

  _makeSorter(sortField: string, sortAsc: boolean): (a: QuestionRatingStats, b: QuestionRatingStats) => number {
    let first: number, last: number;
    first = sortAsc ? 1 : 0;
    last = first ? 0 : 1;
    return (a: QuestionRatingStats, b: QuestionRatingStats) => {
      return a[sortField] > b[sortField] ? first : last;
    };
  }

  _toggleSort(e) {
    const field = e.target.innerHTML.toLowerCase();
    if (this.sortField !== field) this._fireAction('sortField', field);
    else this._fireAction('sortAsc', !this.sortAsc);
  }

  _concepts(assignments: Assignment[]): Concept[] {
    return uniqueProp(this._questions(assignments).map(question => question.concept), 'id');
  }

  _questionOnly(text: string): string {
    return parse(text).ast[0].content.replace('<p>', '').replace('</p><p>', '');
  }

  _computeQuestionStats(assignments: Assignment[]): QuestionRatingStats[] {
    return flatten(assignments.map(assignment => {
      return assignment.questions.map(question => {
        const quality = averageProp(question.ratings, 'quality');
        const accuracy = averageProp(question.ratings, 'alignment');
        const difficulty = averageProp(question.ratings, 'difficulty');
        return {
          assignmentId: assignment.id,
          conceptId: question.concept.id,
          text: question.text
          quality,
          accuracy,
          difficulty,
          overall: ((quality + accuracy + difficulty) / 3).toPrecision(2)
        };
      });
    }));
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    const keys = Object.keys(componentState);
    if (keys.includes('assignments')) this.assignments = componentState.assignments;
    if (keys.includes('assignments')) this.questionStats = this._computeQuestionStats(componentState.assignments);
    if (keys.includes('courseId')) this.courseId = componentState.courseId;
    if (keys.includes('loaded')) this.loaded = componentState.loaded;
    if (keys.includes('assignmentId')) this.assignmentId = componentState.assignmentId;
    if (keys.includes('conceptId')) this.conceptId = componentState.conceptId;
    if (keys.includes('sortField')) this.sortField = componentState.sortField;
    if (keys.includes('sortAsc')) this.sortAsc = componentState.sortAsc;
    this.userToken = state.userToken;
    this.user = state.user;
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
