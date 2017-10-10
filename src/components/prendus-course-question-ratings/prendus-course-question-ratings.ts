import {
  SetPropertyAction,
  SetComponentPropertyAction
} from '../../typings/actions';
import {
  GQLRequest,
  GQLSubscribe
} from '../../node_modules/prendus-shared/services/graphql-service';
import {
  createUUID,
  fireLocalAction
} from '../../node_modules/prendus-shared/services/utilities-service';
import {
  DEFAULT_EVALUATION_RUBRIC,
  NotificationType
} from '../../services/constants-service';
import {setNotification} from '../../redux/actions'
import {
  User,
  Course,
  Rubric,
} from '../../typings/index.d';

export class PrendusCourseQuestionRatings extends Polymer.Element {

  constructor() {
    super();
    this.componentId = createUUID();
  }

  static get is() { return 'prendus-course-question-ratings'; }

  static get properties() {
    return {
      sortField: String,
      sortAsc: Boolean,
      rubric: Object,
      user: Object,
      userToken: String,
      orderBy: {
        type: String,
        computed: '_computeOrderBy(sortField, sortAsc)'
      },
      filter: {
        type: Object,
        computed: '_computeFilter(courseId, user, assignmentId, conceptId)'
      },
      fetchQuestions: {
        type: Function,
        computed: '_computeFetchQuestions(orderBy, filter, userToken)'
      },
      categories: {
        type: Object,
        computed: '_computeCategories(rubric)'
      },
      courseId: {
        type: String,
        observer: '_courseIdChanged'
      },
    }
  }

  //Computed Properties
  _computeOrderBy(sortField: string, sortAsc: boolean): string {
    return categoryCamelCase(sortField) + (sortAsc ? '_ASC' : '_DESC');
  }

  _computeCategories(rubric: Rubric): string[] {
    return ['Student', ...Object.keys(rubric), 'Overall'];
  }

  _computeFilter(courseId: string, user: User, assignmentId: string, conceptId: string): object {
    const filter = {
      assignment: {
        course: {
          id: courseId
        }
      },
      author: {},
      concept: {}
    };
    if (!user || user.role !== 'INSTRUCTOR')
      filter.author.id = (user || {}).id;
    if (assignmentId !== 'ALL')
      filter.assignment.id = assignmentId;
    if (conceptId !== 'ALL')
      filter.concept.id = conceptId;
    return filter;
  }

  _computeFetchQuestions(orderBy: string, filter: object, userToken: string): (i: number, n: number) => Promise<object> {
    if (!orderBy || !filter || !userToken)
      return undefined;
    return async (pageIndex, pageAmount) => loadQuestions({
      orderBy,
      filter,
      pageIndex,
      pageAmount
    }, userToken, this._handleError.bind(this));
  }

  _ariaSort(category: string, sortField: string, sortAsc: boolean): string {
    if (category === sortField && sortAsc) return 'ascending';
    else if (category === sortField && !sortAsc) return 'descending';
    return 'none';
  }

  async _courseIdChanged(courseId) {
    const course = await loadCourse(courseId, this.userToken, this._handleError.bind(this));
    this.action = fireLocalAction(this.componentId, 'course', course);
    this.action = fireLocalAction(this.componentId, 'assignmentId', 'ALL');
    this.action = fireLocalAction(this.componentId, 'conceptId', 'ALL');
    this.action = fireLocalAction(this.componentId, 'sortField', 'overall');
    this.action = fireLocalAction(this.componentId, 'sortAsc', false);
    this.action = fireLocalAction(this.componentId, 'rubric', DEFAULT_EVALUATION_RUBRIC);
    //TODO: Fix permissions for subscription
    //subscribeToData(this.componentId, this.courseId, this._updateData.bind(this));
  }

  //Event Handlers
  async _updateData(data: object) {
    //TODO: Fix permissions and then append the new question rating to the list
    console.log(data);
  }

  _assignmentIdChanged(e: Event) {
    this.action = fireLocalAction(this.componentId, 'assignmentId', e.target.value);
  }

  _conceptIdChanged(e: Event) {
    this.action = fireLocalAction(this.componentId, 'conceptId', e.target.value);
  }

  _toggleSort(e: Event) {
    const field = e.target.innerHTML.trim();
    if (this.sortField !== field)
      this.action = fireLocalAction(this.componentId, 'sortField', field);
    else
      this.action = fireLocalAction(this.componentId, 'sortAsc', !this.sortAsc);
  }

  _checkToggleSort(e: Event) {
    if (e.which === 13 || e.which === 32)
      this._toggleSort(e);
  }

  _handleError(error: any) {
    this.action = setNotification(error.message, NotificationType.ERROR)
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state.components[this.componentId] || {};
    this.course = state.course;
    this.assignmentId = state.assignmentId || 'ALL';
    this.conceptId = state.conceptId || 'ALL';
    this.sortField = state.sortField || 'overall';
    this.sortAsc = state.sortAsc;
    this.rubric = state.rubric;
  }
}

function categoryCamelCase(category: string) {
  //This assumes the whitespace separated Prendus default category names because eventually this function won't be needed when graph.cool has a better order by api
  return category
    .replace(/^(\w)/, (m, c) => c.toLowerCase())
    .replace(/\s+(\w)/g, (m, c) => c.toUpperCase());
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

async function loadCourse(courseId: string, userToken: string, cb: (err: any) => void): Course {
  const data = await GQLRequest(`
  query getCourse($courseId: ID!) {
    course: Course(id: $courseId) {
      id
      title
      assignments {
        id
        title
      }
      subject {
        concepts {
          id
          title
        }
      }
    }
  }`, {courseId}, userToken, cb);
  return data.course;
}


async function loadQuestions(variables: GQLVariables, userToken: string, cb: (err: any) => void) {
  console.log(variables);
  const data = await GQLRequest(`
      query getQuestions($filter: QuestionFilter, $orderBy: QuestionOrderBy, $pageAmount: Int!, $pageIndex: Int!) {
        questions: allQuestions(filter: $filter, orderBy: $orderBy, first: $pageAmount, skip: $pageIndex) {
          id
          author {
            email
          }
          text
          code
          overall
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

  return data.questions;
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

window.customElements.define(PrendusCourseQuestionRatings.is, PrendusCourseQuestionRatings);
