import {
  createUUID,
  asyncMap,
  asyncForEach
} from '../../../../src/node_modules/prendus-shared/services/utilities-service';
import {RootReducer} from '../../../../src/redux/reducers';
import {PrendusCourseQuestionRatings} from '../../../../src/components/prendus-course-question-ratings/prendus-course-question-ratings';
import {DEFAULT_EVALUATION_RUBRIC} from '../../../../src/services/constants-service';
import {CourseArb} from '../../services/arbitraries-service';
import {averageCategoryScores} from '../../../../src/services/question-stats';
import {getListener} from '../../services/utilities-service';
import {
  saveArbitrary,
  createTestUser,
  deleteTestUsers,
  deleteArbitrary
} from '../../services/dataGen-service';

const jsc = require('jsverify');
const courseArb = jsc.nonshrink(CourseArb);
const coursesArb = jsc.small(jsc.nearray(courseArb));

const TABLE_LOADED = 'table-loaded';

class PrendusCourseQuestionRatingsTest extends Polymer.Element {

  static get is() { return 'prendus-course-question-ratings-test' }

  constructor() {
    super();
    this.componentId = createUUID();
    this.rootReducer = RootReducer;
  }

  authenticate(user) {
    this.action = {
      type: 'SET_PROPERTY',
      key: 'userToken',
      value: user.token
    };
    this.action = {
      type: 'SET_PROPERTY',
      key: 'user',
      value: user
    }
  }

  attachTable() {
    const table = new PrendusCourseQuestionRatings();
    this.shadowRoot.appendChild(table);
    return table;
  }

  async cleanup(table, coursesData, student, instructor) {
    try {
      await asyncForEach(coursesData, deleteArbitrary);
      await deleteTestUsers(student, instructor);
      this.shadowRoot.removeChild(table);
    } catch (e) {
      console.error(e);
    }
  }

  prepareTests(test) {

    test('Set course id without residual state', [courseArb], async (course: Course) => {
      let success = false, student, instructor, courseData, table;
      try {
        student = await createTestUser('STUDENT');
        instructor = await createTestUser('INSTRUCTOR');
        courseData = await saveArbitrary(assignUserIds(course, instructor.id, student.id));
        table = this.attachTable();
        this.authenticate(instructor);
        success = await changeCourseId(table, courseData);
      } catch (e) {
        console.error(e);
        await this.cleanup(table, [courseData], student, instructor);
        return false;
      }
      await this.cleanup(table, [courseData], student, instructor);
      return success;
    });

    test('Set course id with residual state', [coursesArb], async (courses: Courses) => {
      let success = false, student, instructor, coursesData, table;
      try {
        student = await createTestUser('STUDENT');
        instructor = await createTestUser('INSTRUCTOR');
        coursesData = await asyncMap(
          courses,
          async course => saveArbitrary(assignUserIds(course, instructor.id, student.id))
        );
        table = this.attachTable();
        this.authenticate(instructor);
        const results = await asyncMap(coursesData, async (data) => {
          const result = await changeCourseId(table, data);
          return result;
        });
        success = results.every(result => result);
      } catch (e) {
        console.error(e);
        await this.cleanup(table, coursesData, student, instructor);
        return false;
      }
      await this.cleanup(table, coursesData, student, instructor);
      return success;
    });

    test('Set assignment id and concept id', [courseArb], async (course: Course) => {
      try {
        const student = await createTestUser('STUDENT');
        const instructor = await createTestUser('INSTRUCTOR');
        const courseData = await saveArbitrary(assignUserIds(course, instructor.id, student.id));
        const table = this.attachTable();
        this.authenticate(instructor);
        const fulfilled = getListener(TABLE_LOADED, table);
        table.courseId = courseData.Course.id;
        await fulfilled;
        const conceptIds = getConceptIds(courseData);
        const assignmentIds = getAssignmentIds(courseData);
        const results = (await asyncMap(assignmentIds, async assignmentId => {
          return asyncMap(conceptIds, async conceptId => {
            const loaded = getListener(TABLE_LOADED, table);
            table.assignmentId = assignmentId;
            table.conceptId = conceptId;
            await loaded;
            const filtered = table.shadowRoot.querySelector('prendus-infinite-list').items;
            return verifyFilter(assignmentId, conceptId, filtered);
          })
        })).reduce(flatten, []);
        this.shadowRoot.removeChild(table);
        const success = results.every(result => result);
        await deleteArbitrary(courseData);
        await deleteTestUsers(student, instructor);
        return success;
      } catch (e) {
        console.error(e);
        return false;
      }
    });

    test('Sort columns', [courseArb], async (course: Course) => {
      try {
        const student = await createTestUser('STUDENT');
        const instructor = await createTestUser('INSTRUCTOR');
        const courseData = await saveArbitrary(assignUserIds(course, instructor.id, student.id));
        const table = this.attachTable();
        this.authenticate(instructor);
        const fulfilled = getListener(TABLE_LOADED, table);
        table.courseId = courseData.Course.id;
        await fulfilled;
        const columns = ['Overall', 'Student', ...Object.keys(DEFAULT_EVALUATION_RUBRIC)];
        const results = (await asyncMap(columns, async sortField => {
          return asyncMap([true, false], async sortAsc => {
            const loaded = getListener(TABLE_LOADED, table);
            table.sortField = sortField;
            table.sortAsc = sortAsc;
            await loaded;
            const sorted = table.shadowRoot.querySelector('prendus-infinite-list').items;
            return verifySort(sortField, sortAsc, sorted);
          });
        })).reduce(flatten, []);
        this.shadowRoot.removeChild(table);
        const success = results.every(result => result);
        await deleteArbitrary(courseData);
        await deleteTestUsers(student, instructor);
        return success;
      } catch (e) {
        console.error(e);
        return false;
      }
    });
  }

  stateChange(e: Event) {
  }
}

// Utils
function assignUserIds(course: Course, instructorId: string, studentId: string): Course {
  return {
    ...course,
    authorId: instructorId,
    enrolledStudentsIds: [studentId],
    assignments: course.assignments.map(
      assignment => ({
        ...assignment,
        authorId: instructorId,
        questions: assignment.questions.map(
          question => ({
            ...question,
            authorId: studentId,
            ratings: question.ratings.map(
              rating => ({
                ...rating,
                raterId: studentId
              })
            )
          })
        )
      })
    )
  }
}

function getConceptIds(courseData): string[] {
  return [
    ...courseData.Course.Assignment
      .map(assignment => assignment.Question)
      .reduce(flatten, [])
      .map(question => question.Concept.id),
    'ALL',
  ];
}

function getAssignmentIds(courseData): string[] {
  return [
    ...courseData.Course.Assignment.map(assignment => assignment.id),
    'ALL',
  ];
}

function flatten(arr: any[], el: any): any[] {
  return arr.concat(Array.isArray(el) ? el.reduce(flatten, []) : el);
}

// Properties
async function changeCourseId(table: PrendusCourseQuestionRatings, courseData: object): boolean {
  const fulfilled = getListener(TABLE_LOADED, table);
  table.courseId = courseData.Course.id;
  console.log('changing course id', table.courseId);
  await fulfilled;
  console.log('changed course id', table.courseId);
  return verifyTable(table, courseData);
}

function verifyTable(table: PrendusCourseQuestionRatings, courseData: object): boolean {
  const questions = courseData
    .Course
    .Assignment
    .map(assignment => assignment.Question)
    .reduce(flatten, []);
  let success = table.courseId === courseData.Course.id;
  console.log('courseId', success, table.course.id, courseData.Course.id);
  success = success && table.course.id === courseData.Course.id;
  success = success && questions.every(
      question => table
      .shadowRoot
      .querySelector('prendus-infinite-list')
      .items
      .map(q => q.id)
      .indexOf(question.id) > -1
  );
  console.log('questions', success, questions, table.shadowRoot.querySelector('prendus-infinite-list').items.map(q => q.id));
  success = success&& table.assignmentId === 'ALL';
  console.log('assignmentId', success, table.assignmentId);
  success = success&& table.conceptId === 'ALL';
  console.log('conceptId', success, table.conceptId);
  success = success&& table.sortAsc === false;
  console.log('sortAsc', success, table.sortAsc);
  success = success&& table.sortField === 'Overall';
  console.log('sortField', success, table.sortField);
  return success;
}

function verifyFilter(assignmentId: number, conceptId: number, filtered: Question[]): boolean {
  return (assignmentId === 'ALL' || !filtered.some(question => question.assignment.id != assignmentId))
    && (conceptId === 'ALL' || !filtered.some(question => question.concept.id != conceptId));
}

function verifySort(sortField: number, sortAsc: number, sorted: Question[]): boolean {
  return sorted.reduce((result, next, i) => {
    if (!i) return true;
    const prev = sorted[i-1];
    const prevStat = averageCategoryScores(prev)[sortField.toLowerCase()] || 0;
    const nextStat = averageCategoryScores(next)[sortField.toLowerCase()] || 0;
    if (sortAsc) {
      if (sortField === 'Student')
        return result && prev.question.author.email.toLowerCase() <= next.question.author.email.toLowerCase();
      return result && prevStat <= nextStat;
    }
    else {
      if (sortField === 'Student')
        return result && prev.question.author.email.toLowerCase() >= next.question.author.email.toLowerCase();
      return result && prevStat >= nextStat;
    }
  }, true);
}

window.customElements.define(PrendusCourseQuestionRatingsTest.is, PrendusCourseQuestionRatingsTest)
