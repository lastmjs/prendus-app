import {RootReducer} from '../../../../src/redux/reducers';
import {
  Assigment,
  User,
  Course
} from '../../../../src/typings/index.d';
import {
  VerbType,
  ASSIGNMENT_LOADED,
  ASSIGNMENT_SUBMITTED,
  STATEMENT_SENT,
  SCORES_CHANGED
} from '../../../../src/services/constants-service';
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
  checkAnalytics,
  scoreDropdowns,
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

  async cleaner(courseId) {
    await deleteCourseArbitrary(courseId, 'createCourse');
  }

  prepareTests(test) {

    test('Collects correct analytics', [courseArb], async (course: Course) => {
      const reviewAssignment = this.shadowRoot.querySelector('prendus-review-assignment');
      const author = await createTestUser('STUDENT', 'author');
      const viewer = await createTestUser('STUDENT', 'viewer');
      const instructor = await createTestUser('INSTRUCTOR');
      const data = await saveArbitrary(
        assignCourseUserIds(course, instructor.id, author.id),
        'createCourse'
      );
      await authorizeTestUserOnCourse(viewer.id, data.id);
      this.authenticate(viewer);
      const success = (await asyncMap(
        data.assignments,
        loadAndTestAssignment(reviewAssignment)
      )).every(result => result === true);
      await deleteCourseArbitrary(data.id, 'createCourse');
      await deleteTestUsers(author, viewer, instructor);
      return success;
    });

  }

}

function loadAndTestAssignment(reviewAssignment) {
  return async assignment => {
    const setup = getListener(ASSIGNMENT_LOADED, reviewAssignment);
    const dropdowns = reviewAssignment.shadowRoot.querySelector('prendus-rubric-dropdowns');
    const dropdownsSetup = getListener(SCORES_CHANGED, dropdowns);
    reviewAssignment.assignmentId = assignment.id;
    await setup;
    if (!verifyAssignment(assignment, reviewAssignment))
      return false;
    if (assignment.questions.length < reviewAssignment.assignment.numReviewQuestions)
      return reviewAssignment.finished === true;
    const assignmentFinished = getListener(ASSIGNMENT_SUBMITTED, reviewAssignment);
    const expect = await asyncMap(
      (new Array(reviewAssignment.assignment.numReviewQuestions)).fill(0),
      async _ => {
        await dropdownsSetup;
        await scoreDropdowns(dropdowns);
        const submitted = getListener(STATEMENT_SENT, reviewAssignment);
        const btn = reviewAssignment.shadowRoot.querySelector('prendus-carousel').shadowRoot.querySelector('#next-button');
        btn.click();
        await submitted;
        return VerbType.REVIEWED;
      }
    );
    await assignmentFinished;
    const analyticsCorrect = await checkAnalytics(
      assignment.id,
      [VerbType.STARTED, ...expect, VerbType.SUBMITTED],
      reviewAssignment.questions.map(q => q.id)
    );
    return analyticsCorrect && reviewAssignment.finished === true;
  }
}

function verifyAssignment(assignment: Assignment, reviewAssignment): boolean {
  return reviewAssignment.assignment.id === assignment.id;
}

window.customElements.define(PrendusReviewAssignmentTest.is, PrendusReviewAssignmentTest);
