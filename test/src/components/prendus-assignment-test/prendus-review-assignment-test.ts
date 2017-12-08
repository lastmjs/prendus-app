import {RootReducer} from '../../../../src/redux/reducers';
import {
  Assigment,
  User,
  Course
} from '../../../../src/typings/index.d';
import {
  ASSIGNMENT_LOADED,
} from '../../../../src/services/constants-service';
import {
  asyncMap,
} from '../../../../src/node_modules/prendus-shared/services/utilities-service';
import {CourseArb} from '../../services/arbitraries-service';
import {
  setupTestCourse,
  cleanupTestCourse,
  authorizeTestUserOnCourse
} from '../../services/mock-data-service';
import {
  getListener,
} from '../../services/utilities-service';

const jsc = require('jsverify');

const courseArb = jsc.nonshrink(CourseArb);

class PrendusReviewAssignmentTest extends Polymer.Element {

  static get is() { return 'prendus-review-assignment-test' }

  constructor() {
    super();
    this.rootReducer = RootReducer;
  }

  authenticate(user: User) {
    this.action = { type: 'SET_PROPERTY', key: 'userToken', value: user.token };
    this.action = { type: 'SET_PROPERTY', key: 'user', value: user };
  }

  testOverAssignment(testFn) {
    return async course => {
      const reviewAssignment = this.shadowRoot.querySelector('prendus-review-assignment');
      const { author, viewer, instructor, data } = await setupTestCourse(course);
      await authorizeTestUserOnCourse(viewer.id, data.id);
      this.authenticate(viewer);
      try {
        const success = (await asyncMap(
          data.assignments,
          testFn(reviewAssignment)
        )).every(result => result === true);
        await cleanupTestCourse(data, author, viewer, instructor);
        return success;
      } catch (e) {
        console.error(e);
        await cleanupTestCourse(data, author, viewer, instructor);
        return false;
      }
    }
  }

  prepareTests(test) {

    test('Review assignment loads correct assignment', [courseArb], this.testOverAssignment(verifyLoad));

  }

}

function verifyLoad(reviewAssignment) {
  return async assignment => {
    const analytics = reviewAssignment.shadowRoot.querySelector('prendus-assignment-analytics');
    const setup = getListener(ASSIGNMENT_LOADED, analytics);
    reviewAssignment.assignmentId = assignment.id;
    await setup;
    return verifyAssignment(assignment, reviewAssignment, analytics);
  }
}


function verifyAssignment(assignment: Assignment, reviewAssignment, analytics): boolean {
  return reviewAssignment.assignment.id === assignment.id &&
    (
      analytics.finished ||
      assignment.questions.some(q => q.id === reviewAssignment.question.id)
    );
}

window.customElements.define(PrendusReviewAssignmentTest.is, PrendusReviewAssignmentTest);
