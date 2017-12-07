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

  async setup(course: Course) {
    const gradeAssignment = this.shadowRoot.querySelector('prendus-grade-assignment');
    const author = await createTestUser('STUDENT', 'author');
    const viewer = await createTestUser('STUDENT', 'viewer');
    const instructor = await createTestUser('INSTRUCTOR');
    const data = await saveArbitrary(
      assignCourseUserIds(course, instructor.id, author.id),
      'createCourse'
    );
    return {
      gradeAssignment,
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
      const { gradeAssignment, author, viewer, instructor, data } = await this.setup(course);
      await authorizeTestUserOnCourse(viewer.id, data.id);
      this.authenticate(viewer);
      try {
        const success = (await asyncMap(
          data.assignments,
          testFn(gradeAssignment, data.id)
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

    test('Grade assignment loads correct assignment', [courseArb], this.testOverAssignment(verifyLoad));

  }

}

function verifyLoad(gradeAssignment, courseId: string) {
  return async assignment => {
    const analytics = gradeAssignment.shadowRoot.querySelector('prendus-assignment-analytics');
    const setup = getListener(ASSIGNMENT_LOADED, analytics);
    gradeAssignment.assignmentId = assignment.id;
    await setup;
    return verifyAssignment(assignment, gradeAssignment);
  }
}

function verifyAssignment(assignment: Assignment, gradeAssignment): boolean {
    const responses = assignment.questions
      .map(q => q.responses)
      .reduce(flatten, [])
      .map(res => res.userEssays)
      .reduce(flatten, []);
  return responses.some(r => r === gradeAssignment.response);
}

function flatten(arr: any[], el: any): any[] {
  return arr.concat(Array.isArray(el) ? el.reduce(flatten, []) : el);
}

window.customElements.define(PrendusGradeAssignmentTest.is, PrendusGradeAssignmentTest);
