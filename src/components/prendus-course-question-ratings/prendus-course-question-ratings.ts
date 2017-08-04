import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {GQLQuery, GQLMutate} from '../../services/graphql-service';
import {ContainerElement} from '../../typings/container-element';
import {rubric} from '../../typings/evaluation-rubric';
import {User} from '../../typings/user';
import {Assignment} from '../../typings/assignment';
import {Course} from '../../typings/course';
import {QuestionRating} from '../../typings/question-rating';
import {QuestionRatingStats} from '../../typings/question-rating-stats';
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
  course: Course;
  questionStats: QuestionRatingStats[];
  categories: string[];
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
    this._fireLocalAction('loaded', true);
  }

  _handleError(error: any) {
    console.log('error', error);
  }

  async loadQuestions() {
    const data = await GQLQuery(`
        query {
          course: Course(id: "${this.courseId}") {
            id
            title
            assignments {
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
                  ratingJson
                }
              }
            }
          }
        }
    `, this.userToken,
      (key: string, value: any) => { this._fireLocalAction(key, value) },
      this._handleError);
    this._fireLocalAction('categories', Object.keys(rubric));
    this._fireLocalAction('questionStats', this._computeQuestionStats(data.course.assignments));
  }

  async _courseIdChanged() {
    this._fireLocalAction('courseId', this.courseId);
    this._fireLocalAction('loaded', false);
    await this.loadQuestions();
    this._fireLocalAction('loaded', true);
  }

  _assignmentIdChanged(e) {
    this._fireLocalAction('assignmentId', e.target.value);
  }

  _conceptIdChanged(e) {
    this._fireLocalAction('conceptId', e.target.value);
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
    const first: number = sortAsc ? 1 : 0;
    const last: number = first ? 0 : 1;
    return (a: QuestionRatingStats, b: QuestionRatingStats) => {
      const aField = sortField === 'overall' ? Number(a.overall) : Number(a.stats[sortField]);
      const bField = sortField === 'overall' ? Number(b.overall) : Number(b.stats[sortField]);
      return aField > bField ? first : last;
    };
  }

  _toggleSort(e) {
    const field = e.model.item;
    if (this.sortField !== field) this._fireLocalAction('sortField', field);
    else this._fireLocalAction('sortAsc', !this.sortAsc);
  }

  _sortOverall(e) {
    if (this.sortField === 'overall') this._fireLocalAction('sortAsc', !this.sortAsc);
    else this._fireLocalAction('sortField', 'overall');
  }

  _concepts(assignments: Assignment[]): Concept[] {
    return uniqueProp(this._questions(assignments).map(question => question.concept), 'id');
  }

  _questionOnly(text: string): string {
    return parse(text).ast[0].content.replace('<p>', '').replace('</p><p>', '');
  }

  _displayStats(stats: Object, category: string): string {
    return stats[category];
  }

  _computeQuestionOverall(stats: Object): number {
    return (this.categories.reduce((sum, category) => sum + Number(stats[category]), 0) / this.categories.length).toPrecision(2) || 0;
  }

  _computeQuestionStats(assignments: Assignment[]): QuestionRatingStats[] {
    return flatten(assignments.map(assignment => assignment.questions.map(question => {
      const ratings = question.ratings.map(rating => JSON.parse(rating.ratingJson)).filter(rating => rating != null);
      const stats = this.categories.reduce((stats, category) => {
        if (!ratings) return Object.assign(stats, {[category]: 0});
        const categoryStats = ratings.map(rating => rating[category]);
        const total = categoryStats.reduce(sum, 0);
        return Object.assign(stats, {[category]: (total / categoryStats.length * 5).toPrecision(2) });
      }, {});
      return {
        assignmentId: assignment.id,
        conceptId: question.concept.id,
        stats,
        text: question.text,
        overall: this._computeQuestionOverall(stats);
      }
    })));
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    const keys = Object.keys(componentState);
    if (keys.includes('course')) this.course = componentState.course;
    if (keys.includes('questionStats')) this.questionStats = componentState.questionStats;
    if (keys.includes('categories')) this.categories = componentState.categories;
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

function sum (sum: number, num: number): number {
  return sum + num;
}

function weightedSum (sum: number, num: number, i: number): number {
  return sum + num * i;
}

function flatten(arr: any[]): any[] {
  return arr.reduce((acc, elem) => {
    return acc.concat(Array.isArray(elem) ? flatten(elem) : elem);
  },[]);
}

function filterProp(prop: string, val: string): (obj: Object) => boolean {
  return obj => obj[prop] === val;
}

function uniqueProp(arr: Object[], prop: string): Object[] {
  return arr.reduce((filtered: Object[], obj: Object) => {
    if (filtered.filter(filterProp(prop, obj[prop])).length === 0)
      filtered.push(obj);
    return filtered;
  }, []);
}

window.customElements.define(PrendusCourseQuestionRatings.is, PrendusCourseQuestionRatings);
