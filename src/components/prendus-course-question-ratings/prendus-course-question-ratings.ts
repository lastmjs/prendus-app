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
  KeyCode,
  NotificationType,
  Role,
  GQL_SORT_ASC,
  GQL_SORT_DESC,
  ARIA_SORT_ASC,
  ARIA_SORT_NONE,
  ARIA_SORT_DESC,
  STUDENT,
  OVERALL,
  ALL
} from '../../services/constants-service';
import {setNotification} from '../../redux/actions'
import {
  User,
  Course,
  Rubric,
  SetComponentPropertyAction,
  SetPropertyAction,
} from '../../prendus.d';

export class PrendusCourseQuestionRatings extends Polymer.Element {
  action: SetComponentPropertyAction | SetPropertyAction;
  user: User;
  userToken: string;
  sortField: string;
  sortAsc: boolean;
  assignmentId: string;
  conceptId: string;
  authorEmail: string;
  orderBy: object;
  filter: object;
  fetchQuestions: (pageIndex: number, pageAmount: number) => any[];
  categories: string[];
  rubric: Rubric;
  courseId: string;

  constructor() {
    super();
    this.componentId = createUUID();
  }

  static get is() { return 'prendus-course-question-ratings'; }

  static get properties() {
    return {
      sortField: String,
      sortAsc: Boolean,
      assignmentId: String,
      conceptId: String,
      authorEmail: String,
      orderBy: {
        type: String,
        computed: '_computeOrderBy(sortField, sortAsc)'
      },
      filter: {
        type: Object,
        computed: '_computeFilter(course, user, assignmentId, conceptId, authorEmail)'
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
  _computeOrderBy(sortField: string, sortAsc: boolean): string | void {
    if (!sortField || sortAsc === undefined)
      return undefined;
    return categoryCamelCase(sortField) + (sortAsc ? GQL_SORT_ASC : GQL_SORT_DESC);
  }

  _computeCategories(rubric: Rubric): string[] {
    return [...Object.keys(rubric), OVERALL];
  }

  _computeFilter(course: Course, user: User, assignmentId: string, conceptId: string, authorEmail: string): object | void {
    if (!course || !user)
      return undefined;
    const filter = {
      assignment: {
        course: {
          id: course.id
        }
      },
      author: {},
      concept: {}
    };
    if (authorEmail)
      filter.author.email = authorEmail;
    if (user.role !== Role.INSTRUCTOR)
      filter.author.id = (user || {}).id;
    if (assignmentId !== ALL)
      filter.assignment.id = assignmentId;
    if (conceptId !== ALL)
      filter.concept.id = conceptId;
    return filter;
  }

  _computeFetchQuestions(orderBy: string, filter: object, userToken: string): (i: number, n: number) => Promise<object> | void {
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
    if (category === sortField && sortAsc) return ARIA_SORT_ASC;
    else if (category === sortField && !sortAsc) return ARIA_SORT_DESC;
    return ARIA_SORT_NONE;
  }

  async _courseIdChanged(courseId) {
    const course = await loadCourse(courseId, this.userToken, this._handleError.bind(this));
    this.action = fireLocalAction(this.componentId, 'course', course);
    this.action = fireLocalAction(this.componentId, 'assignmentId', ALL);
    this.action = fireLocalAction(this.componentId, 'conceptId', ALL);
    this.action = fireLocalAction(this.componentId, 'sortField', OVERALL);
    this.action = fireLocalAction(this.componentId, 'sortAsc', false);
    this.action = fireLocalAction(this.componentId, 'rubric', DEFAULT_EVALUATION_RUBRIC);
  }

  //Event Handlers
  _tableLoaded(e: CustomEvent) {
    this.dispatchEvent(new CustomEvent('table-loaded'));
  }

  _assignmentIdChanged(e: Event) {
    this.action = fireLocalAction(this.componentId, 'assignmentId', e.target.value);
  }

  _conceptIdChanged(e: Event) {
    this.action = fireLocalAction(this.componentId, 'conceptId', e.target.value);
  }

  _viewQuestion(e: CustomEvent) {
    this.action = fireLocalAction(this.componentId, 'question', e.detail.question);
    this.shadowRoot.querySelector('#question-modal').open();
  }

  _closeQuestion(e: CustomEvent) {
    this.shadowRoot.querySelector('#question-modal').close();
  }

  _toggleSort(e: Event) {
    const field = this.categories[e.model.itemsIndex];
    if (this.sortField !== field)
      this.action = fireLocalAction(this.componentId, 'sortField', field);
    else
      this.action = fireLocalAction(this.componentId, 'sortAsc', !this.sortAsc);
  }

  _checkToggleSort(e: Event) {
    if (e.which === KeyCode.ENTER || e.which === KeyCode.SPACE)
      this._toggleSort(e);
  }

  _handleError(error: any) {
    this.action = setNotification(error.message, NotificationType.ERROR)
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    this.course = componentState.course;
    this.assignmentId = componentState.assignmentId || ALL;
    this.conceptId = componentState.conceptId || ALL;
    this.sortField = componentState.sortField || OVERALL;
    this.sortAsc = componentState.sortAsc;
    this.rubric = componentState.rubric;
    this.question = componentState.question;
    this.user = state.user;
    this.userToken = state.userToken;
  }
}

function categoryCamelCase(category: string) {
  //This assumes the whitespace separated Prendus default category names because eventually this function won't be needed when graph.cool has a better order by api
  return category
    .replace(/^(\w)/, (m, c) => c.toLowerCase())
    .replace(/\s+(\w)/g, (m, c) => c.toUpperCase());
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

window.customElements.define(PrendusCourseQuestionRatings.is, PrendusCourseQuestionRatings);
