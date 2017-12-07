import {RootReducer} from '../../../../src/redux/reducers';
import {
  Assignment,
  User,
  Course
} from '../../../../src/typings/index.d';
import {
  asyncMap,
  asyncForEach,
  createUUID,
  fireLocalAction
} from '../../../../src/node_modules/prendus-shared/services/utilities-service';
import {CourseArb} from '../../services/arbitraries-service';
import {
  setupTestCourse,
  cleanupTestCourse,
  authorizeTestUserOnCourse
} from '../../services/dataGen-service';
import {
  getListener,
  checkAnalytics,
  analyticBuilder
} from '../../services/utilities-service';
import {
  STATEMENT_SENT,
  ASSIGNMENT_LOADED,
  ASSIGNMENT_SUBMITTED
  ASSIGNMENT_VALIDATION_ERROR,
  VerbType
} from '../../../../src/services/constants-service';

const jsc = require('jsverify');

const courseArb = jsc.nonshrink(CourseArb);

class PrendusAssignmentAnalyticsTest extends Polymer.Element {

  static get is() { return 'prendus-assignment-analytics-test'; }

  constructor() {
    super();
    this.rootReducer = RootReducer;
    this.componentId = createUUID();
  }

  authenticate(user: User) {
    this.action = {
      type: 'SET_PROPERTY',
      key: 'userToken',
      value: user.token
    };
    this.action = {
      type: 'SET_PROPERTY',
      key: 'user',
      value: user
    };
  }

  testOverAssignments(testFn, authorize: boolean, error: boolean) {
    return async course => {
      const analytics = this.shadowRoot.querySelector('prendus-assignment-analytics');
      const { author, viewer, instructor, data } = await setupTestCourse(course);
      if (authorize)
        await authorizeTestUserOnCourse(viewer.id, data.id);
      this.authenticate(viewer);
      this.action = fireLocalAction(this.componentId, 'assignment', getAnalyticsAssignment(data, error));
      try {
        const success = (await asyncMap(
          data.assignments,
          testFn(analytics, data.id)
        )).every(result => result === true);
        await cleanupTestCourse(data, author, viewer, instructor);
        return success;
      } catch(e) {
        console.error(e);
        await cleanupTestCourse(data, author, viewer, instructor);
        return false;
      }
    }
  }

  prepareTests(test) {

    test('Displays error message to unauthorized users', [courseArb], this.testOverAssignments(testUnauthorizedMessage, false, false));

    test('Loads data with load function', [courseArb], this.testOverAssignments(testLoadItems, true, false));

    test('Checks for errors with error function', [courseArb], this.testOverAssignments(testError, true, true));

    test('Generates analytics with the submit function', [courseArb], this.testOverAssignments(testSubmitItem, true, false));

  }

  stateChange(e: CustomEvent) {
    const { state } = e.detail;
    const componentState = state.components[this.componentId] || {};
    this.assignment = componentState.assignment;
  }
}

function getAnalyticsAssignment(course: Course, error: boolean): AnalyticsAssignment {
  return {
    load: async assignmentId => {
      const assignment = course.assignments.find(a => a.id === assignmentId);
      return {
        title: 'Test',
        items: assignment.questions,
        taken: false
      };
    },
    error: () => error ? 'Test error' : null,
    submit: async question => question.id
  };
}

function testUnauthorizedMessage(analytics, courseId: string): (assignment: Assignment) => Promise<boolean> {
  return async assignment => {
    const auth = analytics.shadowRoot.querySelector('prendus-assignment-authorization');
    const event = getListener('unauthorized', auth);
    analytics.assignmentId = assignment.id;
    await event;
    const { items, unauthorized, authResult: { authenticated, payed, enrolled } } = analytics;
    return items === undefined &&
      unauthorized === true &&
      authenticated === true &&
      payed === false &&
      enrolled === false;
  }
}


function testLoadItems(analytics, courseId: string): (assignment: Assignment) => Promise<boolean> {
  return async assignment => {
    const event = getListener(ASSIGNMENT_LOADED, analytics);
    analytics.assignmentId = assignment.id;
    await event;
    const { items, unauthorized, finished, loaded } = analytics;
    return items.length === assignment.questions.length &&
      items.every(q => assignment.questions.some(_q => q.id === _q.id)) &&
      unauthorized === false &&
      finished === (items.length === 0) &&
      loaded === true;
  }
}

function testError(analytics, courseId: string): (assignment: Assignment) => Promise<boolean> {
  return async assignment => {
    const event = getListener(ASSIGNMENT_LOADED, analytics);
    analytics.assignmentId = assignment.id;
    await event;
    const first = analytics.item;
    const next = analytics.shadowRoot.querySelector('prendus-carousel').shadowRoot.querySelector('#next-button');
    asyncForEach(
      analytics.items,
      async _ => {
        const error = getListener(ASSIGNMENT_VALIDATION_ERROR, analytics);
        next.click();
        await error;
      }
    );
    return first === analytics.item && analytics.finished === (analytics.items.length === 0);
  }
}

function testSubmitItem(analytics, courseId: string): (assignment: Assignment) => Promise<boolean> {
  return async assignment => {
    const event = getListener(ASSIGNMENT_LOADED, analytics);
    analytics.assignmentId = assignment.id;
    await event;
    const next = analytics.shadowRoot.querySelector('prendus-carousel').shadowRoot.querySelector('#next-button');
    let i = 0;
    const analytic = analyticBuilder(courseId, assignmentId);
    const finished = getListener(ASSIGNMENT_SUBMITTED, analytics);
    const start = analytic(VerbType.STARTED, null);
    const statements = await asyncMap(
      analytics.items,
      async _ => {
        if (analytics.item !== assignment.questions[i])
          throw new Error('Wrong question in analytics assignment');
        const sent = getListener(STATEMENT_SENT, analytics);
        next.click();
        await sent;
        return analytic('TEST', assignment.questions[i++]);
      }
    );
    const submitted = analytic(VerbType.SUBMITTED, null);
    const expected = assignment.questions.length
      ? [start, ...statements, submitted]
      : [];
    await finished;
    const success = await checkAnalytics(assignment.id, expected);
    return success && analytics.finished === true;
  }
}

window.customElements.define(PrendusAssignmentAnalyticsTest.is, PrendusAssignmentAnalyticsTest);

