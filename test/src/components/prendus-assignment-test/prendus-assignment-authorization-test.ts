import {RootReducer} from '../../../../src/redux/reducers';
import {
  Assigment,
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

  prepareTests(test) {

    test('Fires an unauthorized event for unauthorized users', [courseArb], async (course: Course) => {
      const { auth, author, viewer, instructor, data } = await this.setup(course);
      this.authenticate(viewer);
      try {
        const success = (await asyncMap(
          data.assignments,
          waitForEvent(auth, 'unauthorized')
        )).every(result => result === true);
        await this.cleanup(data, author, viewer, instructor);
        return success;
      } catch(e) {
        console.error(e);
        await this.cleanup(data, author, viewer, instructor);
        return false;
      }
    });

    test('Fires an authorized event for authorized users', [courseArb], async (course: Course) => {
      const { auth, author, viewer, instructor, data } = await this.setup(course);
      await authorizeTestUserOnCourse(viewer.id, data.id);
      this.authenticate(viewer);
      try {
        const success = (await asyncMap(
          data.assignments,
          waitForEvent(auth, 'authorized')
        )).every(result => result === true);
        await this.cleanup(data, author, viewer, instructor);
        return success;
      } catch(e) {
        console.error(e);
        await this.cleanup(data, author, viewer, instructor);
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

function waitForEvent(auth, eventName: string): (assignment: Assignment) => Promise<boolean> {
  return async assignment => {
    const event = getListener(eventName, auth);
    auth.assignmentId = assignment.id;
    await event;
    return true;
  }
}

window.customElements.define(PrendusAssignmentAuthorizationTest.is, PrendusAssignmentAuthorizationTest);
