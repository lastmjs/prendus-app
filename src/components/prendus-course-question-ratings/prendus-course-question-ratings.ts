import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {GQLRequest, GQLSubscribe} from '../../node_modules/prendus-shared/services/graphql-service';
import {createUUID, fireLocalAction} from '../../node_modules/prendus-shared/services/utilities-service';
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
          assignment: {
            course: {
              id: ""
            }
          }
        }
      }
    }
  }

  constructor() {
    super();
    this.componentId = createUUID();
  }

  _handleError(error: any) {
    this.action = setNotification(error.message, NotificationType.ERROR)
  }

  async loadData(courseId: string, pageAmount: number, pageIndex: number) {
    const data = await loadCourse(
      {courseId, filter: this.filter, pageAmount, pageIndex},
      this.userToken,
      this._handleError.bind(this)
    );
    const questionStats = computeTableStats(data.questions);
    if (questionStats.length !== 0) {
      this.action = fireLocalAction(this.componentId, 'course', data.course);
      this.action = fireLocalAction(this.componentId, 'questionStats', [...(this.questionStats || []), ...questionStats]);
      await this.loadData(courseId, pageAmount, pageIndex + pageAmount);
    }
  }

  async _courseIdChanged(courseId, oldCourseId) {
    this.action = fireLocalAction(this.componentId, 'courseId', courseId);
    this.action = fireLocalAction(this.componentId, 'loaded', false);
    this.action = fireLocalAction(this.componentId, 'assignmentId', 'ALL');
    this.action = fireLocalAction(this.componentId, 'conceptId', 'ALL');
    this.action = fireLocalAction(this.componentId, 'sortField', 'overall');
    this.action = fireLocalAction(this.componentId, 'sortAsc', false);
    this.action = fireLocalAction(this.componentId, 'categories', Object.keys(DEFAULT_EVALUATION_RUBRIC));
    this.action = await getAndSetUser();
    await this.loadData(courseId, 20, 0);
    //TODO: Fix permissions for subscription
    //subscribeToData(this.componentId, this.courseId, this._updateData.bind(this));
    this.action = fireLocalAction(this.componentId, 'loaded', true);
    this.dispatchEvent(new CustomEvent('table-loaded'));
  }

  async _updateData(data: object) {
    //TODO: Fix permissions and then append the new question rating to the list
    console.log(data);
  }

  _assignmentIdChanged(e) {
    this.action = fireLocalAction(this.componentId, 'assignmentId', e.target.value);
  }

  _conceptIdChanged(e) {
    this.action = fireLocalAction(this.componentId, 'conceptId', e.target.value);
  }

  _assignments(questionStats: object[]): Assignment[] {
    return uniqueProp(questionStats.map(stats => stats.question.assignment), 'id');
  }

  _concepts(questionStats: object[]): Concept[] {
    return uniqueProp(questionStats.map(stats => stats.question.concept), 'id');
  }

  _questionOnly(text: string): string {
    return truncate(parse(text, null).ast[0].content.replace(/<p>|<p style=".*">|<\/p>|<img.*\/>/g, ''));
  }

  _precision(num: number): string {
    return num.toPrecision(2);
  }

  _rawScores(scores: object, category: string): any {
    return scores ? scores[category] : null;
  }

  _makeFilter(assignmentId: string, conceptId: string): (stats: object) => boolean {
    return (stats: object): boolean => {
      return (assignmentId === 'ALL' || stats.question.assignment.id === assignmentId)
      && (conceptId === 'ALL' || conceptId === stats.question.concept.id);
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
      const aStats = a.sortStats[sortField.toLowerCase()] || 0;
      const bStats = b.sortStats[sortField.toLowerCase()] || 0;
      if (aStats === bStats) return 0;
      return aStats > bStats ? first : last;
    };
  }

  _viewQuestion(e: CustomEvent) {
    this.action = fireLocalAction(this.componentId, 'question', e.model.item.question);
    this.shadowRoot.querySelector('#question-modal').open();
  }

  _closeQuestionModal(e: CustomEvent) {
    this.shadowRoot.querySelector('#question-modal').close();
  }

  _toggleSort(e) {
    const field = e.target.innerHTML;
    if (this.sortField !== field)
      this.action = fireLocalAction(this.componentId, 'sortField', field);
    else
      this.action = fireLocalAction(this.componentId, 'sortAsc', !this.sortAsc);
  }

  _ariaSort(category: string, sortField: string, sortAsc: boolean): string {
    if (category === sortField && sortAsc) return 'ascending';
    else if (category === sortField && !sortAsc) return 'descending';
    return 'none';
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
    this.question= componentState.question;
    this.categories = componentState.categories;
    this.courseId = componentState.courseId;
    this.loaded = componentState.loaded;
    this.assignmentId = componentState.assignmentId || 'ALL';
    this.conceptId = componentState.conceptId || 'ALL';
    this.sortField = componentState.sortField || 'overall';
    this.sortAsc = componentState.sortAsc;
    this.userToken = state.userToken;
    this.user = state.user;
    this.filter.assignment.course.id = this.courseId;
    if (this.user && this.user.role !== 'INSTRUCTOR') {
      this.filter.author = {};
      this.filter.author.id = this.user.id;
    }
  }
}

function objectKeysToLowerCase(obj: object): object {
  return Object.keys(obj)
    .reduce((result, k) => {
      return {
        ...result,
        [k.toLowerCase()]: obj[k]
      }
    }, {});
}

function computeTableStats(questions: Question[]): object[] {
  return questions.map(question => {
    const rawScores = categoryScores(question);
    const overall = overallRating(question, 2); //TODO determine max score for each category in rubric
    const averages = averageCategoryScores(question);
    //make sort stats lookup case insensitive
    const sortStats = {
      overall,
      ...objectKeysToLowerCase(averages)
    };
    return {
      question,
      sortStats,
      rawScores
    }
  });
}

async function loadCourse(variables: GQLVariables, userToken: string, cb: (err: any) => void) {
  const data = await GQLRequest(`
      query getCourse($courseId: ID!, $filter: QuestionFilter, $pageAmount: Int!, $pageIndex: Int!) {
        course: Course(id: $courseId) {
          id
          title
        }
        questions: allQuestions(filter: $filter, first: $pageAmount, skip: $pageIndex) {
          id
          author {
            email
          }
          text
          code
          ratings {
            scores {
              category
              score
            }
          }
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
  `,
    variables,
    userToken,
    cb
  );

  return data;
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
