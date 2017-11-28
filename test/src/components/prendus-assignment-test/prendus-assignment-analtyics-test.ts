import {RootReducer} from '../../../../src/redux/reducers';
import {
  Assigment,
  User,
  Course
} from '../../../../src/typings/index.d';
import {
  asyncMap,
  asyncForEach,
  createUUID
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

  async setup(course: Course) {
    const analytics = this.shadowRoot.querySelector('prendus-assignment-analytics');
    const author = await createTestUser('STUDENT', 'author');
    const viewer = await createTestUser('STUDENT', 'viewer');
    const instructor = await createTestUser('INSTRUCTOR');
    const data = await saveArbitrary(
      assignCourseUserIds(course, instructor.id, author.id),
      'createCourse'
    );
    return {
      analytics,
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

  testOverAssignments(testFn) {
    return async course => {
      const { analytics, author, viewer, instructor, data } = await this.setup(course);
      this.authenticate(viewer);
      try {
        const success = (await asyncMap(
          data.assignments,
          testFn(analytics)
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

  _load(course: Course) {
    return async assignmentId => {
      const assignment = course.assignments.find(a => a.id === assignmentId);
      return {
        title: 'Test',
        courseId: course.id,
        items: assignment ? assignment.questions : [],
        taken: false
      };
    };
  }

  _error(testError: boolean) {
    return () => testError ? 'Test error' : null;
  }

  async _submit(question: Question) {
    return question.id;
  }

  prepareTests(test) {

    test('Displays error message to unauthorized users', [courseArb], testOverAssignments(unauthorizedMessage));

    test('Loads assignments with residual state', [courseArb], testOverAssignments(loadAssignment));

    test('Calls error callback', [courseArb], testOverAssignments(errorCallback));

    test('Collects analytics', [courseArb], testOverAssignments(analytics));

  }

  stateChange(e: CustomEvent) {
    const { state } = e.detail;
    const componentState = e.detail.components[this.componentId] || {};
    this.load = componentState.load;
    this.error = componentState.error;
  }
}

window.customElements.define(PrendusAssignmentAnalyticsTest.is, PrendusAssignmentAnalyticsTest);
