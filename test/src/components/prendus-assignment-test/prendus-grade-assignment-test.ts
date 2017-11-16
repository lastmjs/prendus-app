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

class PrendusGradeAssignmentTest extends Polymer.Element {

  static get is() { return 'prendus-grade-assignment-test' }

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
    await deleteCourseArbitrary(courseId);
  }

  prepareTests(test) {

    test('Grade assignment collects correct analytics', [courseArb], async (course: Course) => {
      const gradeAssignment = this.shadowRoot.querySelector('prendus-grade-assignment');
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
        loadAndTestAssignment(gradeAssignment)
      )).every(result => result === true);
      await deleteCourseArbitrary(data.id);
      await deleteTestUsers(author, viewer, instructor);
      return success;
    });

  }

}

function loadAndTestAssignment(gradeAssignment) {
  return async assignment => {
    const responses = assignment.questions
      .map(q => q.responses)
      .map(res => res.userEssays)
      .reduce(flatten, []);
    const setup = getListener(ASSIGNMENT_LOADED, gradeAssignment);
    const dropdowns = gradeAssignment.shadowRoot.querySelector('prendus-rubric-dropdowns');
    const dropdownsSetup = getListener(SCORES_CHANGED, dropdowns);
    console.log('setting assignment id');
    gradeAssignment.assignmentId = assignment.id;
    await setup;
    console.log('set assignment id');
    if (!verifyAssignment(assignment, gradeAssignment))
      return false;
    console.log('verified assignment id');
    if (responses.length < gradeAssignment.assignment.numGradeResponses)
      return gradeAssignment.finished === true;
    console.log('starting integration test');
    const assignmentFinished = getListener(ASSIGNMENT_SUBMITTED, gradeAssignment);
    const expect = await asyncMap(
      (new Array(gradeAssignment.assignment.numGradeResponses)).fill(0),
      async _ => {
        console.log('starting dropdowns');
        await dropdownsSetup;
        await scoreDropdowns(dropdowns);
        const submitted = getListener(STATEMENT_SENT, gradeAssignment);
        const btn = gradeAssignment.shadowRoot.querySelector('prendus-carousel').shadowRoot.querySelector('#next-button');
        btn.click();
        await submitted;
        console.log('finished dropdowns');
        return VerbType.GRADED;
      }
    );
    console.log('waiting for assignment to submit');
    await assignmentFinished;
    console.log('submitted assignment');
    const analyticsCorrect = await checkAnalytics(
      assignment.id,
      [VerbType.STARTED, ...expect, VerbType.SUBMITTED],
      gradeAssignment.responses.map(essay => essay.questionResponse.question.id)
    );
    return analyticsCorrect && gradeAssignment.finished === true;
  }
}

function verifyAssignment(assignment: Assignment, gradeAssignment): boolean {
  return gradeAssignment.assignment.id === assignment.id;
}

function flatten(arr: any[], el: any): any[] {
  return arr.concat(Array.isArray(el) ? el.reduce(flatten, []) : el);
}

window.customElements.define(PrendusGradeAssignmentTest.is, PrendusGradeAssignmentTest);
