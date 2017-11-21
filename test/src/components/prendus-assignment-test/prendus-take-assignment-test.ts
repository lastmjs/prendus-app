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
  STATEMENT_SENT
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
} from '../../services/utilities-service';

const jsc = require('jsverify');

const courseArb = jsc.nonshrink(CourseArb);

class PrendusTakeAssignmentTest extends Polymer.Element {

  static get is() { return 'prendus-take-assignment-test' }

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

    test('Take assignment collects correct analytics', [courseArb], async (course: Course) => {
      const takeAssignment = this.shadowRoot.querySelector('prendus-take-assignment');
      const author = await createTestUser('STUDENT', 'author');
      const viewer = await createTestUser('STUDENT', 'viewer');
      const instructor = await createTestUser('INSTRUCTOR');
      this.authenticate(viewer);
      const data = await saveArbitrary(
        assignCourseUserIds(course, instructor.id, author.id),
        'createCourse'
      );
      await authorizeTestUserOnCourse(viewer.id, data.id);
      console.log('done authorizing student');
      const success = (await asyncMap(
        data.assignments,
        loadAndTestAssignment(takeAssignment)
      )).every(result => result === true);
      await deleteCourseArbitrary(data.id);
      await deleteTestUsers(author, viewer, instructor);
      return success;
    });

  }

}

function loadAndTestAssignment(takeAssignment) {
  return async assignment => {
    console.log('setting assignment');
    const setup = getListener(ASSIGNMENT_LOADED, takeAssignment);
    const finished = getListener(ASSIGNMENT_SUBMITTED, takeAssignment);
    takeAssignment.assignmentId = assignment.id;
    await setup;
    console.log('assignment loaded');
    if (!verifyAssignment(assignment, takeAssignment))
      return false;
    console.log('assignment id matches');
    if (assignment.questions.length < takeAssignment.assignment.numResponseQuestions)
      return takeAssignment.finished === true;
    console.log('starting integration test');
    const expect = await asyncMap(
      (new Array(takeAssignment.assignment.numResponseQuestions)).fill(0),
      async _ => {
        console.log(
          takeAssignment
          .shadowRoot.querySelector('prendus-flaggable-question')
          .shadowRoot.querySelector('prendus-view-question')
          .shadowRoot.querySelector('#contentDiv')
        )
        return VerbType.RESPONDED;
      }
    );
    await finished;
    const analyticsCorrect = await checkAnalytics(assignment.id, [VerbType.STARTED, ...expect, VerbType.SUBMITTED]);
    return analyticsCorrect && takeAssignment.finished === true;
  }
}

function verifyAssignment(assignment: Assignment, takeAssignment): boolean {
  return takeAssignment.assignment.id === assignment.id;
}

window.customElements.define(PrendusTakeAssignmentTest.is, PrendusTakeAssignmentTest);
