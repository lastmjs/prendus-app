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
import {parse} from '../../node_modules/assessml/assessml';
import {
  categoryScores,
  averageCategoryScores,
  overallRating
} from '../../services/question-stats';
import {setNotification} from '../../redux/actions'
import {
  User,
  QuestionRatingStats,
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
        computed: '_computeFetchQuestions(courseId, orderBy, filter, userToken)'
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
    return Object.keys(rubric);
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

  _computeFetchQuestions(courseId: string, orderBy: string, filter: object, userToken: string): (i: number, n: number) => Promise<object> {
    if (!orderBy || !filter || !userToken)
      return undefined;
    return async (pageIndex, pageAmount) => loadCourse({
      courseId,
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
    this.action = fireLocalAction(this.componentId, 'assignmentId', 'ALL');
    this.action = fireLocalAction(this.componentId, 'conceptId', 'ALL');
    this.action = fireLocalAction(this.componentId, 'sortField', 'overall');
    this.action = fireLocalAction(this.componentId, 'sortAsc', false);
    this.action = fireLocalAction(this.componentId, 'questionStats', []);
    this.action = fireLocalAction(this.componentId, 'rubric', DEFAULT_EVALUATION_RUBRIC);
    //TODO: Fix permissions for subscription
    //subscribeToData(this.componentId, this.courseId, this._updateData.bind(this));
  }

  //Event Handlers
  async _updateData(data: object) {
    //TODO: Fix permissions and then append the new question rating to the list
    console.log(data);
  }

  _appendQuestions(e: CustomEvent) {
    const { items, init } = e.detail;
    this.action = fireLocalAction(this.componentId, 'course', items.course);
    const questionStats = computeTableStats(items.questions);
    this.action = init
      ? fireLocalAction(this.componentId, 'questionStats', questionStats)
      : fireLocalAction(this.componentId, 'questionStats', [...this.questionStats, ...questionStats]);
  }

  _assignmentIdChanged(e: Event) {
    this.action = fireLocalAction(this.componentId, 'assignmentId', e.target.value);
  }

  _conceptIdChanged(e: Event) {
    this.action = fireLocalAction(this.componentId, 'conceptId', e.target.value);
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

  _viewQuestion(e: CustomEvent) {
    this.action = fireLocalAction(this.componentId, 'question', e.model.item.question);
    this.shadowRoot.querySelector('#question-modal').open();
  }

  _closeQuestionModal(e: CustomEvent) {
    this.shadowRoot.querySelector('#question-modal').close();
  }

  _toggleSort(e: Event) {
    const field = e.target.innerHTML;
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
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    this.course = componentState.course;
    this.questionStats = componentState.questionStats;
    this.question= componentState.question;
    this.categories = componentState.categories;
    this.assignmentId = componentState.assignmentId || 'ALL';
    this.conceptId = componentState.conceptId || 'ALL';
    this.sortField = componentState.sortField || 'overall';
    this.sortAsc = componentState.sortAsc;
    this.rubric = componentState.rubric;
    this.userToken = state.userToken;
    this.user = state.user;
  }
}

function computeTableStats(questions: Question[]): QuestionRatingStats[] {
  return questions.map(question => {
    const rawScores = categoryScores(question);
    return {
      question,
      rawScores
    }
  });
}

function categoryCamelCase(category: string) {
  //This assumes the whitespace separated Prendus default category names because eventually this function won't be needed when graph.cool has a better order by api
  return category
    .replace(/^(\w)/, (m, c) => c.toLowerCase())
    .replace(/\s+(\w)/g, (m, c) => c.toUpperCase());
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

async function loadCourse(variables: GQLVariables, userToken: string, cb: (err: any) => void) {
  console.log(variables);
  const data = await GQLRequest(`
      query getCourse($courseId: ID!, $filter: QuestionFilter, $orderBy: QuestionOrderBy, $pageAmount: Int!, $pageIndex: Int!) {
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

window.customElements.define(PrendusCourseQuestionRatings.is, PrendusCourseQuestionRatings);
