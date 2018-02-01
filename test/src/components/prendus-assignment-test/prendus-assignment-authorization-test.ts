import {RootReducer} from '../../../../src/redux/reducers';
import {
  Assignment,
  User,
  Course,
  AuthResult
} from '../../../../src/typings/index.d';
import {
  asyncMap,
} from '../../../../src/node_modules/prendus-shared/services/utilities-service';
import {
  CourseArb,
  AuthResultArb
} from '../../services/arbitraries-service';
import {
  setupTestCourse,
  cleanupTestCourse,
  enrollInTestCourse,
  payForTestCourse
} from '../../services/mock-data-service';
import {
  getListener,
  assignCourseUserIds,
} from '../../services/utilities-service';

const jsc = require('jsverify');

const courseArb = jsc.nonshrink(
  CourseArb.smap(
    course => ({
      ...course,
      assignments: course.assignments.map(assignment => ({
        ...assignment,
        questions: []
      }))
    }),
    course => course
  )
);

class PrendusAssignmentAuthorizationTest extends Polymer.Element {

  static get is() { return 'prendus-assignment-authorization-test'; }

  constructor() {
    super();
    this.rootReducer = RootReducer;
  }

  authenticate(user: User) {
    this.action = { type: 'SET_PROPERTY', key: 'userToken', value: user.token };
    this.action = { type: 'SET_PROPERTY', key: 'user', value: user };
  }

  clearState() {
    this.action = { type: 'SET_PROPERTY', key: 'userToken', value: null };
    this.action = { type: 'SET_PROPERTY', key: 'user', value: null };
  }

  prepareTests(test) {
    test('Computes expected auth result', [courseArb, AuthResultArb], async (course: Course, authResult: AuthResult) => {
      const auth = this.shadowRoot.querySelector('prendus-assignment-authorization');
      const { author, viewer, instructor, data } = await setupTestCourse(course);
      const _authResult = {...authResult, courseId: data.id };
      const { authenticated, enrolled, payed, instructor: owner } = authResult;
      const user = owner ? instructor : viewer;
      if (authenticated) this.authenticate(user);
      if (enrolled) await enrollInTestCourse(user.id, data.id);
      if (payed) await payForTestCourse(user.id, data.id);
      const eventName = authenticated && (owner || (enrolled && payed)) ? 'authorized' : 'unauthorized';
      try {
        const success = (await asyncMap(
          data.assignments,
          waitForEvent(auth, eventName, _authResult)
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
    });
  }

  stateChange(e: CustomEvent) {
    const { state } = e.detail;
    this.user = state.user;
    this.userToken = state.userToken;
  }
}

function waitForEvent(auth, eventName: string, expected: object): (assignment: Assignment) => Promise<boolean> {
  return async assignment => {
    const event = getListener(eventName, auth);
    auth.assignmentId = assignment.id;
    const e = await event;
    const { result: { authenticated, payed, enrolled, courseId, instructor } } = e.detail;
    return authenticated === expected.authenticated && (
      !authenticated ||
      (payed === expected.payed &&
      enrolled === expected.enrolled &&
      instructor === expected.instructor &&
      courseId === expected.courseId)
    );
  }
}

window.customElements.define(PrendusAssignmentAuthorizationTest.is, PrendusAssignmentAuthorizationTest);
