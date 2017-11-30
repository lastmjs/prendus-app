import {RootReducer} from '../../../../src/redux/reducers';
import {
  Assignment,
  User,
  Course
} from '../../../../src/typings/index.d';
import {
  asyncMap,
  asyncForEach
} from '../../../../src/node_modules/prendus-shared/services/utilities-service';
import {CourseArb} from '../../services/arbitraries-service';
import {
  saveArbitrary,
  deleteCourseArbitrary,
  createTestUser,
  deleteTestUsers,
  authorizeTestUserOnCourse
} from '../../services/dataGen-service';
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

  async setup(course: Course) {
    const auth = this.shadowRoot.querySelector('prendus-assignment-authorization');
    const author = await createTestUser('STUDENT', 'author');
    const viewer = await createTestUser('STUDENT', 'viewer');
    const instructor = await createTestUser('INSTRUCTOR');
    const data = await saveArbitrary(
      assignCourseUserIds(course, instructor.id, author.id),
      'createCourse'
    );
    return {
      auth,
      author,
      viewer,
      instructor,
      data
    }
  }

  async cleanup(data, author, viewer, instructor) {
    await deleteCourseArbitrary(data.id);
    await deleteTestUsers(author, viewer, instructor);
  }

  testOverAssignments(eventName, authenticate: boolean, authorize: boolean, expected: object) {
    return async course => {
      const { auth, author, viewer, instructor, data } = await this.setup(course);
      if (authenticate)
        this.authenticate(viewer);
      if (authorize)
        await authorizeTestUserOnCourse(viewer.id, data.id);
      try {
        const success = (await asyncMap(
          data.assignments,
          waitForEvent(auth, eventName, {...expected, courseId: data.id })
        )).every(result => result === true);
        await this.cleanup(data, author, viewer, instructor);
        return success;
      } catch(e) {
        console.error(e);
        await this.cleanup(data, author, viewer, instructor);
        return false;
      }
    }
  }

  prepareTests(test) {
    test(
      'Fires an unauthorized event for unauthenticated users',
      [courseArb],
      this.testOverAssignments('unauthorized', false, true, { authenticated: false, payed: undefined, enrolled: undefined })
    );
    test(
      'Fires an unauthorized event for unauthorized users',
      [courseArb],
      this.testOverAssignments('unauthorized', true, false, { authenticated: true, payed: false, enrolled: false })
    );
    test(
      'Fires an authorized event for authorized users',
      [courseArb],
      this.testOverAssignments('authorized', true, true, { authenticated: true, payed: true, enrolled: true })
    );
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
    const { authenticated, payed, enrolled, courseId } = e.detail;
    return authenticated === expected.authenticated &&
      payed === expected.payed &&
      enrolled === expected.enrolled &&
      (courseId === expected.courseId || !authenticated);
  }
}

window.customElements.define(PrendusAssignmentAuthorizationTest.is, PrendusAssignmentAuthorizationTest);
