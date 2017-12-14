import {RootReducer} from '../../../../src/redux/reducers';
import {
  Assignment,
  User,
  AssignmentFunctions,
  Course
} from '../../../../src/prendus.d';
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
} from '../../services/mock-data-service';
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

class PrendusAssignmentSharedTest extends Polymer.Element {

  static get is() { return 'prendus-assignment-shared-test'; }

  constructor() {
    super();
    this.rootReducer = RootReducer;
    this.componentId = createUUID();
  }

  authenticate(user: User) {
    this.action = { type: 'SET_PROPERTY', key: 'userToken', value: user.token };
    this.action = { type: 'SET_PROPERTY', key: 'user', value: user };
  }

  clearState() {
    this.action = { type: 'SET_PROPERTY', key: 'userToken', value: null };
    this.action = { type: 'SET_PROPERTY', key: 'user', value: null };
    this.action = { type: 'SET_PROPERTY', key: 'functions', value: null };
  }

  testOverAssignments(testFn, authorize: boolean) {
    return async course => {
      const analytics = this.shadowRoot.querySelector('prendus-assignment-shared');
      const { author, viewer, instructor, data } = await setupTestCourse(course);
      if (authorize)
        await authorizeTestUserOnCourse(viewer.id, data.id);
      this.authenticate(viewer);
      this.action = fireLocalAction(this.componentId, 'functions', getAssignmentFunctions(data));
      try {
        const success = (await asyncMap(
          data.assignments,
          testFn(analytics, data.id)
        )).every(result => result === true);
        await cleanupTestCourse(data, author, viewer, instructor);
        this.clearState();
        return success;
      } catch(e) {
        console.error(e);
        await cleanupTestCourse(data, author, viewer, instructor);
        this.clearState();
        return false;
      }
    }
  }

  prepareTests(test) {

    test('Displays error message to unauthorized users', [courseArb], this.testOverAssignments(testUnauthorizedMessage, false));

    test('Test assignment functions', [courseArb], this.testOverAssignments(testAssignmentFunctions, true));

  }

  stateChange(e: CustomEvent) {
    const { state } = e.detail;
    const componentState = state.components[this.componentId] || {};
    this.functions = componentState.functions;
  }
}

function getAssignmentFunctions(course: Course): AssignmentFunctions {
  return {
    loadItems: async assignmentId => {
      const assignment = course.assignments.find(a => a.id === assignmentId);
      return {
        title: 'Test',
        items: assignment.questions,
        taken: false
      };
    },
    error: () => (.5 - Math.random()) < 0 ? 'Test error' : null,
    submitItem: async question => question.id
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

function testAssignmentFunctions(analytics, courseId: string): (assignment: Assignment) => Promise<boolean> {
  return async assignment => {
    const loaded = getListener(ASSIGNMENT_LOADED, analytics);
    analytics.assignmentId = assignment.id;
    await loaded;
    if (!verifyLoad(assignment, analytics, courseId))
      return false;
    if (!assignment.questions.length) {
      const notStarted = await checkAnalytics(assignment.id, []);
      return notStarted && analytics.finished === true && analytics.loaded === true;
    }
    const next = analytics.shadowRoot.querySelector('prendus-carousel').shadowRoot.querySelector('#next-button');
    let i = 0;
    const analytic = analyticBuilder(courseId, assignment.id);
    const start = analytic(VerbType.STARTED, null);
    const statements = await asyncMap(
      analytics.items,
      async _ => {
        if (analytics.item !== assignment.questions[i])
          throw new Error('Wrong question in analytics assignment');
        const done = Promise.race([getListener(STATEMENT_SENT, analytics), getListener(ASSIGNMENT_VALIDATION_ERROR, analytics)]);
        next.click();
        const e = await done;
        console.log(e);
        if (e.type === ASSIGNMENT_VALIDATION_ERROR)
          return null;
        return analytic('TEST', assignment.questions[i++]);
      }
    );
    const submitted = analytic(VerbType.SUBMITTED, null);
    const expected = [start, ...statements, (i === analytics.items.length ? submitted : null)];
    const finished = i === analytics.items.length ? getListener(ASSIGNMENT_SUBMITTED, analytics) : Promise.resolve();
    await finished;
    const success = await checkAnalytics(assignment.id, expected.filter(statement => statement !== null));
    return success && (analytics.finished === (i === analytics.items.length));
  }
}

function verifyLoad(assignment: Assignment, analytics, courseId: string): boolean {
  const { items, unauthorized, finished, loaded } = analytics;
  return items.length === assignment.questions.length &&
    items.every(q => assignment.questions.some(_q => q.id === _q.id)) &&
    unauthorized === false &&
    finished === (items.length === 0) &&
    loaded === true;
}

window.customElements.define(PrendusAssignmentSharedTest.is, PrendusAssignmentSharedTest);

