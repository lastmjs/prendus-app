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
  analyticBuilder,
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

  async setup(course: Course) {
    const takeAssignment = this.shadowRoot.querySelector('prendus-take-assignment');
    const author = await createTestUser('STUDENT', 'author');
    const viewer = await createTestUser('STUDENT', 'viewer');
    const instructor = await createTestUser('INSTRUCTOR');
    const data = await saveArbitrary(
      assignCourseUserIds(course, instructor.id, author.id),
      'createCourse'
    );
    return {
      takeAssignment,
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
      const { takeAssignment, author, viewer, instructor, data } = await this.setup(course);
      await authorizeTestUserOnCourse(viewer.id, data.id);
      this.authenticate(viewer);
      try {
        const success = (await asyncMap(
          data.assignments,
          testFn(takeAssignment)
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

    test('Quiz assignment loads correct assignment', [courseArb], this.testOverAssignment(verifyLoad));

  }

}

function verifyLoad(takeAssignment) {
  return async assignment => {
    const analytics = takeAssignment.shadowRoot.querySelector('prendus-assignment-analytics');
    const setup = getListener(ASSIGNMENT_LOADED, analytics);
    takeAssignment.assignmentId = assignment.id;
    await setup;
    return verifyAssignment(assignment, takeAssignment);
  }
}


function verifyAssignment(assignment: Assignment, takeAssignment): boolean {
  return takeAssignment.assignment.id === assignment.id &&
    assignment.questions.some(q => q.id === takeAssignment.question.id);
}

window.customElements.define(PrendusTakeAssignmentTest.is, PrendusTakeAssignmentTest);
