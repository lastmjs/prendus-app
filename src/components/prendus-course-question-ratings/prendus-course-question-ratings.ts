import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {GQLRequest, GQLSubscribe} from '../../node_modules/prendus-shared/services/graphql-service';
import {createUUID} from '../../node_modules/prendus-shared/services/utilities-service';
import {DEFAULT_EVALUATION_RUBRIC, NotificationType} from '../../services/constants-service';
import {parse} from '../../node_modules/assessml/assessml';
import {categoryScores, averageCategoryScores, overallRating} from '../../services/question-stats';
import {setNotification, getAndSetUser} from '../../redux/actions'

export class PrendusCourseQuestionRatings extends Polymer.Element {
  loaded: boolean;
  action: SetPropertyAction | SetComponentPropertyAction;
  componentId: string;
  userToken: string;
  user: User;
  courseId: string;
  course: Course;
  questionStats: object[];
  categories: string[];
  assignmentId: string;
  conceptId: string;
  sortField: string;
  sortAsc: boolean;

  static get is() { return 'prendus-course-question-ratings'; }

  static get properties() {
    return {
      courseId: {
        observer: '_courseIdChanged'
      },
      filter: {
        type: Object,
        value: {
          author: {
            id: ""
          }
        }
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

  _handleError(error: any) {
    this.action = setNotification(error.message, NotificationType.ERROR)
  }

  async loadData(pageAmount: number, pageIndex: number) {
    const course = await loadCourse(
      {
        courseId: this.courseId,
        filter: this.filter,
        pageAmount,
        pageIndex
      },
      this.userToken,
      this._handleError.bind(this)
    );
    const questionStats = computeTableStats(course.assignments);
    if (questionStats.length !== 0) {
      this._fireLocalAction('course', course);
      this._fireLocalAction('categories', Object.keys(DEFAULT_EVALUATION_RUBRIC));
      this._fireLocalAction('questionStats', [...(this.questionStats || []), ...questionStats]);
      await this.loadData(pageAmount, pageIndex + pageAmount);
    }
  }

  async _courseIdChanged() {
    this._fireLocalAction('courseId', this.courseId);
    this._fireLocalAction('loaded', false);
    this.action = await getAndSetUser();
    await this.loadData(20, 0);
    //TODO: Fix permissions for subscription
    //subscribeToData(this.componentId, this.courseId, this._updateData.bind(this));
    this._fireLocalAction('loaded', true);
    this.dispatchEvent(new CustomEvent('table-loaded'));
  }

  async _updateData(data: object) {
    //TODO: Fix permissions and then append the new question rating to the list
    console.log(data);
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

  _concepts(assignments: Assignment[]): Concept[] {
    return uniqueProp(this._questions(assignments).map(question => question.concept), 'id');
  }

  _questionOnly(text: string): string {
    return truncate(parse(text, null).ast[0].content.replace(/<p>|<p style=".*">|<\/p>|<img.*\/>/g, ''));
  }

  _precision(num: number): string {
    return num.toPrecision(2);
  }

  _prop(obj: object, prop: string): any {
    return obj ? obj[prop] : null;
  }

  _makeFilter(assignmentId: string, conceptId: string): (question: object) => boolean {
    return (question: object): boolean => {
      return (assignmentId === 'ALL' || question.assignmentId === assignmentId)
      && (conceptId === 'ALL' || conceptId === question.conceptId);
    };
  }

  _makeSorter(sortField: string, sortAsc: boolean): (a: object, b: object) => number {
    const first: number = sortAsc ? 1 : -1;
    const last: number = first > 0 ? -1 : 1;
    return (a: object, b: object): number => {
      if (sortField === 'Student') {
        if (a.student.toLowerCase() === b.student.toLowerCase()) return 0;
        return a.student.toLowerCase() > b.student.toLowerCase() ? first : last;
      }
      const aStats = a.sortStats[sortField] || 0;
      const bStats = b.sortStats[sortField] || 0;
      if (aStats === bStats) return 0;
      return aStats > bStats ? first : last;
    };
  }

  _toggleSort(e) {
    const field = e.target.innerHTML;
    const headers = Array.from(this.shadowRoot.querySelectorAll('.sortable'));
    const oldField = headers.find(header => header.innerHTML === this.sortField);
    const newField = headers.find(header => header.innerHTML === field);
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

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    this.course = componentState.course;
    this.questionStats = componentState.questionStats;
    this.categories = componentState.categories;
    this.courseId = componentState.courseId;
    this.loaded = componentState.loaded;
    this.assignmentId = componentState.assignmentId || 'ALL';
    this.conceptId = componentState.conceptId || 'ALL';
    this.sortField = componentState.sortField || 'Overall';
    this.sortAsc = componentState.sortAsc;
    this.userToken = state.userToken;
    this.user = state.user;
    if (this.user && this.user.role === 'INSTRUCTOR') this.filter = {};
    else if (this.user) this.filter.author.id = this.user.id;
  }
}

function computeTableStats(assignments: Assignment[]): object[] {
  return flatten(assignments.map(assignment => assignment.questions.map(question => {
    const rawScores = categoryScores(question);
    const overall = overallRating(question, 2);
    const averages = averageCategoryScores(question);
    return {
      assignmentId: assignment.id,
      conceptId: question.concept.id,
      student: question.author.email,
      text: question.text,
      sortStats: {
        Overall: overall,
        ...averages
      },
      rawScores
    }
  })));
}

async function loadCourse(variables: GQLVariables, userToken: string, cb: (err: any) => void) {
  const data = await GQLRequest(`
      query getCourse($courseId: ID!, $filter: QuestionFilter, $pageAmount: Int!, $pageIndex: Int!) {
        course: Course(id: $courseId) {
          id
          title
          assignments {
            id
            title
            questions(
              filter: $filter
              first: $pageAmount
              skip: $pageIndex
            ) {
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
                scores {
                  category
                  score
                }
              }
            }
          }
        }
      }
  `,
    variables,
    userToken,
    cb
  );

  return data.course;
}

function subscribeToData(componentId: string, courseId: string, cb: (data: any) => void) {
  GQLSubscribe(`
    subscription {
      QuestionRating(
        filter: {
          node: {
            question: {
              assignment: {
                course: {
                  id: "${courseId}"
                }
              }
            }
          }, mutation_in: [CREATED]
        }
      ) {
        node {
          id
          scores {
            category
            score
          }
          question {
            id
            text
            assignment {
              id
              title
            }
            concept {
              id
              title
            }
          }
        }
      }
    }`, componentId, cb);
}

function truncate(str: string): string {
  if (str.length < 100) return str;
  return str.substr(0, 100) + '...';
}

function flatten(arr: any[]): any[] {
  return arr.reduce((acc, elem) => {
    return acc.concat(Array.isArray(elem) ? flatten(elem) : elem);
  },[]);
}

function filterProp(prop: string, val: string): (obj: object) => boolean {
  return obj => obj[prop] === val;
}

function uniqueProp(arr: object[], prop: string): object[] {
  return arr.reduce((filtered: object[], obj: object) => {
    if (filtered.filter(filterProp(prop, obj[prop])).length === 0)
      filtered.push(obj);
    return filtered;
  }, []);
}

window.customElements.define(PrendusCourseQuestionRatings.is, PrendusCourseQuestionRatings);
