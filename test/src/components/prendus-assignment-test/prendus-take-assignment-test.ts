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
} from '../../services/dataGen-service';
import {
  getListener,
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

  testOverAssignment(testFn) {
    return async course => {
      const takeAssignment = this.shadowRoot.querySelector('prendus-take-assignment');
      const { author, viewer, instructor, data } = await setupTestCourse(course);
      await authorizeTestUserOnCourse(viewer.id, data.id);
      this.authenticate(viewer);
      try {
        const success = (await asyncMap(
          data.assignments,
          testFn(takeAssignment)
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
