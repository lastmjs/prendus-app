import {RootReducer} from '../../../../src/redux/reducers';
import {
  Assigment,
  User,
  Course
} from '../../../../src/typings/index.d';
import {
  VerbType
} from '../../../../src/services/constants-service';
import {
  asyncMap,
  asyncForEach
} from '../../../../src/node_modules/prendus-shared/services/utilities-service';
import {CourseArb} from '../../services/arbitraries-service';
import {
  saveArbitrary,
  deleteArbitrary,
  createTestUser,
  deleteTestUsers,
  authorizeTestUserOnCourse
} from '../../services/dataGen-service';
import {
  getListener,
  assignCourseUserIds,
  checkAnalytics,
} from '../../services/utilities-service';

const jsc = require('jsverify');

const courseArb = jsc.nonshrink(CourseArb);

const ASSIGNMENT_LOADED = 'assignment-loaded';

class PrendusReviewAssignmentTest extends Polymer.Element {

  static get is() { return 'prendus-review-assignment-test' }

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

  prepareTests(test) {

    test('Collects correct analytics', [courseArb], async (course: Course) => {
      const reviewAssignment = this.shadowRoot.querySelector('prendus-review-assignment');
      const author = await createTestUser('STUDENT', 'author');
      const viewer = await createTestUser('STUDENT', 'viewer');
      const instructor = await createTestUser('INSTRUCTOR');
      this.authenticate(author);
      const data = await saveArbitrary(
        assignCourseUserIds(course, instructor.id, author.id),
        'createCourse'
      );
      await authorizeTestUserOnCourse(viewer.id, data.id);
      const success = (await asyncMap(
        data.assignments,
        loadAndTestAssignment(reviewAssignment)
      )).every(result => result === true);
      await asyncForEach(data, async assignment => deleteArbitrary(assignment, 'createAssignment'));
      await deleteTestUsers(author, viewer, instructor);
      return success;
    });

  }

}

function loadAndTestAssignment(reviewAssignment) {
  return async assignment => {
    const setup = getListener(ASSIGNMENT_LOADED, reviewAssignment);
    reviewAssignment.assignmentId = assignment.id;
    await setup;
    if (!verifyAssignment(assignment, reviewAssignment))
      return false;
    if (assignment.questions.length < reviewAssignment.assignment.numReviewQuestions)
      return checkAnalytics(assignment.id, [VerbType.STARTED]) && reviewAssignment.finished === true;
    return true;
  }
}

function verifyAssignment(assignment: Assignment, reviewAssignment): boolean {
  return reviewAssignment.assignment.id === assignment.id;
}

window.customElements.define(PrendusReviewAssignmentTest.is, PrendusReviewAssignmentTest);
