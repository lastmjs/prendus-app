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
  ASSIGNMENT_VALIDATION_ERROR,
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
  analyticBuilder
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

  async setup(course: Course) {
    const reviewAssignment = this.shadowRoot.querySelector('prendus-review-assignment');
    const author = await createTestUser('STUDENT', 'author');
    const viewer = await createTestUser('STUDENT', 'viewer');
    const instructor = await createTestUser('INSTRUCTOR');
    const data = await saveArbitrary(
      assignCourseUserIds(course, instructor.id, author.id),
      'createCourse'
    );
    return {
      reviewAssignment,
      author,
      viewer,
      instructor,
      data
    };
  }

  async cleanup(data, author, viewer, instructor) {
    await deleteCourseArbitrary(data.id);
    await deleteTestUsers(author, viewer, instructor);
  }

  testOverAssignment(testFn) {
    return async course => {
      const { reviewAssignment, author, viewer, instructor, data } = await this.setup(course);
      await authorizeTestUserOnCourse(viewer.id, data.id);
      this.authenticate(viewer);
      try {
        const success = (await asyncMap(
          data.assignments,
          testFn(reviewAssignment, data.id)
        )).every(result => result === true);
        await this.cleanup(data, author, viewer, instructor);
        return success;
      } catch (e) {
        console.error(e);
        await this.cleanup(data, author, viewer, instructor);
        return false;
      }
    }
  }

  prepareTests(test) {

    test('Review assignment loads correct assignment', [courseArb], this.testOverAssignment(verifyLoad));

    test('Review assignment detects errors in rubric', [courseArb], this.testOverAssignment(verifyErrorCallback));

    test('Review assignment collects correct analytics', [courseArb], this.testOverAssignment(verifyAnalytics));

  }

}

function verifyLoad(reviewAssignment, courseId) {
  return async assignment => {
    const analytics = reviewAssignment.shadowRoot.querySelector('prendus-assignment-analytics');
    const setup = getListener(ASSIGNMENT_LOADED, analytics);
    reviewAssignment.assignmentId = assignment.id;
    await setup;
    return verifyAssignment(assignment, reviewAssignment);
  }
}

function verifyAnalytics(reviewAssignment, courseId) {
  return async assignment => {
    const analytics = reviewAssignment.shadowRoot.querySelector('prendus-assignment-analytics');
    const setup = getListener(ASSIGNMENT_LOADED, analytics);
    const dropdowns = reviewAssignment.shadowRoot.querySelector('prendus-rubric-dropdowns');
    const dropdownsSetup = getListener(SCORES_CHANGED, dropdowns);
    reviewAssignment.assignmentId = assignment.id;
    await setup;
    if (!verifyAssignment(assignment, reviewAssignment))
      return false;
    if (assignment.questions.length < reviewAssignment.assignment.numReviewQuestions)
      return analytics.finished === true;
    const assignmentFinished = getListener(ASSIGNMENT_SUBMITTED, analytics);
    const analytic = analyticBuilder(courseId, assignment.id);
    const start = analytic(VerbType.STARTED, null);
    const btn = analytics.shadowRoot.querySelector('prendus-carousel').shadowRoot.querySelector('#next-button');
    await dropdownsSetup;
    let i = 0;
    const statements = await asyncMap(
      (new Array(reviewAssignment.assignment.numReviewQuestions)).fill(0),
      async _ => {
        await scoreDropdowns(dropdowns);
        const submitted = getListener(STATEMENT_SENT, analytic);
        btn.click();
        await submitted;
        return analytic(VerbType.REVIEWED, analytic.items[i++]);
      }
    );
    const end = analytic(VerbType.SUBMITTED, null);
    await assignmentFinished;
    const analyticsCorrect = await checkAnalytics(
      assignment.id,
      [start, ...statements, end],
    );
    return analyticsCorrect;
  }
}

function verifyErrorCallback(reviewAssignment, courseId) {
  return async assignment => {
    const analytics = reviewAssignment.shadowRoot.querySelector('prendus-assignment-analytics');
    const setup = getListener(ASSIGNMENT_LOADED, analytics);
    const dropdowns = reviewAssignment.shadowRoot.querySelector('prendus-rubric-dropdowns');
    const dropdownsSetup = getListener(SCORES_CHANGED, dropdowns);
    reviewAssignment.assignmentId = assignment.id;
    await setup;
    if (!verifyAssignment(assignment, reviewAssignment))
      return false;
    if (assignment.questions.length < reviewAssignment.assignment.numReviewQuestions)
      return analytics.finished === true;
    const btn = analytics.shadowRoot.querySelector('prendus-carousel').shadowRoot.querySelector('#next-button');
    await dropdownsSetup;
    const first = analytic.item;
    await asyncForEach(
      (new Array(reviewAssignment.assignment.numReviewQuestions)).fill(0),
      async _ => {
        const error = getListener(ASSIGNMENT_VALIDATION_ERROR, analytic);
        btn.click();
        await error;
      }
    );
    return first === analytic.item && analytic.finished === false && reviewAssignment.question === first;
  }
}

function verifyAssignment(assignment: Assignment, reviewAssignment): boolean {
  return reviewAssignment.assignment.id === assignment.id;
}

window.customElements.define(PrendusReviewAssignmentTest.is, PrendusReviewAssignmentTest);
