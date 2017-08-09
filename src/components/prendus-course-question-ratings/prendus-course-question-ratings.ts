import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {GQLQuery, GQLSubscribe} from '../../services/graphql-service';
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
  sortField: string = 'Overall';
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
    //TODO: use notification service when finished
    console.log('error', error);
  }

  _subscribeToData() {
    GQLSubscribe(`
      subscription {
        Assignment(
          filter: {
            node: {
              course: {
                id: "${this.courseId}"
              }
            }, mutation_in: [CREATED, DELETED]
          }
        ) {node { id }}
      }`, this.componentId, this._updateData.bind(this));
    GQLSubscribe(`
      subscription {
        Question(
          filter: {
            node: {
              assignment: {
                course: {
                  id: "${this.courseId}"
                }
              }
            }, mutation_in: [CREATED, DELETED]
          }
        ) {node {id}}
      }`, this.componentId, this._updateData.bind(this));
    GQLSubscribe(`
      subscription {
        QuestionRating(
          filter: {
            node: {
              question: {
                assignment: {
                  course: {
                    id: "${this.courseId}"
                  }
                }
              }
            }, mutation_in: [CREATED]
          }
        ) {node {id}}
      }`, this.componentId, this._updateData.bind(this));
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
                author {
                  email
                }
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
    this._subscribeToData();
    this._fireLocalAction('loaded', true);
  }

  async _updateData(data) {
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
      if (sortField === 'Student') {
        if (a.student.toLowerCase() === b.student.toLowerCase()) return 0;
        return a.student.toLowerCase() > b.student.toLowerCase() ? first : last;
      }
      if (a.stats[sortField] === b.stats[sortField]) return 0;
      return a.stats[sortField] > b.stats[sortField] ? first : last;
    };
  }

  _findHeader(needle: string, haystack: any): any {
    for (let i = 0; i < haystack.length; i++) {
      if (haystack[i].innerHTML === needle)
        return haystack[i];
    }
    return null;
  }

  _toggleSort(e) {
    const field = e.target.innerHTML;
    const headers = this.shadowRoot.querySelectorAll('.sortable');
    const oldField = this._findHeader(this.sortField, headers);
    const newField = this._findHeader(field, headers);
    if (this.sortField !== field) {
      oldField && oldField.parentNode.setAttribute('aria-sort', 'none');
      newField && newField.parentNode.setAttribute('aria-sort', this.sortAsc ? 'ascending' : 'descending');
      this._fireLocalAction('sortField', field);
    }
    else {
      newField && newField.parentNode.setAttribute('aria-sort', this.sortAsc ? 'descending' : 'ascending');
      this._fireLocalAction('sortAsc', !this.sortAsc);
    }
  }

  _checkToggleSort(e) {
    if (e.which === 13 || e.which === 32)
      this._toggleSort(e);
  }

  _concepts(assignments: Assignment[]): Concept[] {
    return uniqueProp(this._questions(assignments).map(question => question.concept), 'id');
  }

  _questionOnly(text: string): string {
    return this._truncate(parse(text).ast[0].content.replace('<p>', '').replace('</p><p>', ''));
  }

  _truncate(str: string): string {
    if (str.length < 100) return str;
    return str.substr(0, 100) + '...';
  }

  _prop(obj: Object, prop: string): any {
    return obj[prop];
  }

  _categoryScores(ratings: Object[]): Object {
    return this.categories.reduce((scores, category) => {
      const score = sumProp(ratings, category) / ratings.length;
      return Object.assign(scores, {[category]: score});
    }, {});
  }

  _computeQuestionOverall(stats: Object): number {
    const vals = Object.values(stats);
    return (vals.reduce(sum, 0) / vals.length * 5).toPrecision(2) || 0;
  }

  _barStats(ratings: Object[], category: string): Object[] {
    return ratings.reduce((stats: number[], rating: Object) => {
      const i = rating[category];
      if (i !== NaN && i >=0) {
        while (i > stats.length - 1) stats.push(0);
        stats[i]++;
      }
      return stats;
    }, []);
  }

  _computeRatingStats(ratings: Object[]): Object {
    const categoryScores = this._categoryScores(ratings);
    return {
      Overall: this._computeQuestionOverall(categoryScores),
      ...categoryScores,
    };
  }

  _computeQuestionStats(assignments: Assignment[]): QuestionRatingStats[] {
    return flatten(assignments.map(assignment => assignment.questions.map(question => {
      const ratings = question.ratings.map(rating => JSON.parse(rating.ratingJson)).filter(rating => rating != null);
      const stats = this._computeRatingStats(ratings);
      return {
        assignmentId: assignment.id,
        conceptId: question.concept.id,
        student: question.author.email,
        text: question.text,
        ratings,
        stats
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
  return sum + (Number(num) || 0);
}

function sumProp (arr: Object[], prop): number {
  return arr.reduce((sum: number, obj: Object) => sum + (Number(obj[prop]) || 0), 0)
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
