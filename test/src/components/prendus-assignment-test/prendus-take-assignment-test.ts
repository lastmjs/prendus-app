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
  scoreDropdowns,
} from '../../services/utilities-service';

const jsc = require('jsverify');

const courseArb = jsc.nonshrink(CourseArb);

const ASSIGNMENT_LOADED = 'assignment-loaded';
const QUIZ_SUBMITTED = 'quiz-submitted';

class PrendusGradeAssignmentTest extends Polymer.Element {

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

  cleaner(author, viewer, instructor, course, purchase) {
    this.clean = async () => {
      await deleteArbitrary(course, 'createCourse');
      await deleteArbitrary(purchase, 'createPurchase');
      await deleteTestUsers(author, viewer, instructor);
    }
  }

  prepareTests(test) {

    test('Collects correct analytics', [courseArb], async (course: Course) => {
      const takeAssignment = this.shadowRoot.querySelector('prendus-take-assignment');
      const author = await createTestUser('STUDENT', 'author');
      const viewer = await createTestUser('STUDENT', 'viewer');
      const instructor = await createTestUser('INSTRUCTOR');
      this.authenticate(viewer);
      const data = await saveArbitrary(
        assignCourseUserIds(course, instructor.id, author.id),
        'createCourse'
      );
      const purchase = await authorizeTestUserOnCourse(viewer.id, data.id);
      this.cleaner(author,viewer,instructor,data,purchase);
      console.log('done authorizing student');
      const success = (await asyncMap(
        data.assignments,
        loadAndTestAssignment(takeAssignment)
      )).every(result => result === true);
      await deleteArbitrary(data, 'createCourse');
      await deleteArbitrary(purchase, 'createPurchase');
      await deleteTestUsers(author, viewer, instructor);
      return success;
    });

  }

}

function loadAndTestAssignment(takeAssignment) {
  return async assignment => {
    console.log('setting assignment');
    const setup = getListener(ASSIGNMENT_LOADED, takeAssignment);
    takeAssignment.assignmentId = assignment.id;
    await setup;
    console.log('assignment loaded');
    if (!verifyAssignment(assignment, takeAssignment))
      return false;
    console.log('assignment id matches');
    if (assignment.questions.length < takeAssignment.assignment.numReviewQuestions)
      return checkAnalytics(assignment.id, [VerbType.STARTED]) && takeAssignment.finished === true;
    console.log('starting integration test');
    const expect = await asyncMap(
      takeAssignment.assignment.numReviewQuestions,
      async _ => {
        console.log('starting grade');
        const dropdowns = takeAssignment.shadowRoot.querySelector('prendus-rubric-dropdowns');
        await scoreDropdowns(dropdowns);
        console.log('submitting grade');
        const submitted = getListener(QUIZ_SUBMITTED, takeAssignment);
        takeAssignment.shadowRoot.querySelector('prendus-carousel').shadowRoot.querySelector('next-button').click();
        await submitted;
        console.log('submitted');
        return VerbType.RESPONDED;
      }
    );
    return checkAnalytics(assignment.id, [VerbType.STARTED, ...expect, VerbType.SUBMITTED]) && takeAssignment.finished === true;
  }
}

function verifyAssignment(assignment: Assignment, takeAssignment): boolean {
  return takeAssignment.assignment.id === assignment.id;
}

window.customElements.define(PrendusGradeAssignmentTest.is, PrendusGradeAssignmentTest);
