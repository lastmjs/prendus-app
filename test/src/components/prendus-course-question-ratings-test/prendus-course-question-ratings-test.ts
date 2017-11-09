import {
  createUUID,
  asyncMap,
  asyncForEach,
  fireLocalAction
} from '../../../../src/node_modules/prendus-shared/services/utilities-service';
import {RootReducer} from '../../../../src/redux/reducers';
import {PrendusCourseQuestionRatings} from '../../../../src/components/prendus-course-question-ratings/prendus-course-question-ratings';
import {DEFAULT_EVALUATION_RUBRIC} from '../../../../src/services/constants-service';
import {CourseArb} from '../../services/arbitraries-service';
import {averageCategoryScores} from '../../../../src/services/question-stats';
import {getListener} from '../../services/utilities-service';
import {
  saveArbitrary,
  deleteArbitrary,
  createTestUser,
  deleteTestUsers,
} from '../../services/dataGen-service';

const jsc = require('jsverify');
const courseArb = jsc.nonshrink(CourseArb);
const coursesArb = jsc.small(jsc.nearray(courseArb));

const TABLE_LOADED = 'table-loaded';

class PrendusCourseQuestionRatingsTest extends Polymer.Element {

  static get is() { return 'prendus-course-question-ratings-test' }

  constructor() {
    super();
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
    table.style.display = 'none';
    this.shadowRoot.appendChild(table);
    return table;
  }

  async cleanup(table, coursesData, student, instructor) {
    try {
      await asyncForEach(coursesData, course => deleteArbitrary(course, 'createCourse'));
      await deleteTestUsers(student, instructor);
      this.shadowRoot.removeChild(table);
    } catch (e) {
      console.error(e);
    }
  }

  prepareTests(test) {

    test('Set course id without residual state', [courseArb], async (course: Course) => {
      try {
        const { student, instructor, courseData } = (await setupData(course));
        const table = this.attachTable();
        this.authenticate(instructor);
        const success = await changeCourseId(table, courseData);
        await this.cleanup(table, [courseData], student, instructor);
        return success;
      } catch (e) {
        console.error(e);
        return false;
      }
    });

    test('Set course id with residual state', [coursesArb], async (courses: Courses) => {
      try {
        const student = await createTestUser('STUDENT');
        const instructor = await createTestUser('INSTRUCTOR');
        const coursesData = await asyncMap(
          courses,
          async course => saveArbitrary(
            assignUserIds(course, instructor.id, student.id)
            'createCourse'
          )
        );
        const table = this.attachTable();
        this.authenticate(instructor);
        const results = await asyncMap(coursesData, async (data) => {
          const result = await changeCourseId(table, data);
          return result;
        });
        const success = results.every(result => result);
        await this.cleanup(table, coursesData, student, instructor);
        return success;
      } catch (e) {
        console.error(e);
        return false;
      }
    });

    test('Set assignment id and concept id', [courseArb], async (course: Course) => {
      try {
        const { student, instructor, courseData } = (await setupData(course));
        const table = this.attachTable();
        this.authenticate(instructor);
        await changeCourseId(table, courseData);
        const success = await jsc.check(tableFilters(table, courseData), { tests: 10 });
        await this.cleanup(table, [courseData], student, instructor);
        return success;
      } catch (e) {
        console.error(e);
        return false;
      }
    });

    test('Sort columns', [courseArb], async (course: Course) => {
      try {
        const { student, instructor, courseData } = (await setupData(course));
        const table = this.attachTable();
        this.authenticate(instructor);
        await changeCourseId(table, courseData);
        const success = await jsc.check(tableIsSortable(table, courseData), { tests: 10 });
        await this.cleanup(table, [courseData], student, instructor);
        return success;
      } catch (e) {
        console.error(e);
        return false;
      }
    });
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

async function setupData(course: Course) {
  const student = await createTestUser('STUDENT');
  const instructor = await createTestUser('INSTRUCTOR');
  const courseData = await saveArbitrary(
    assignUserIds(course, instructor.id, student.id),
    'createCourse'
  );
  return { student, instructor, courseData };
}

function getConceptIds(course): string[] {
  return [
    ...course.assignments
      .map(assignment => assignment.questions)
      .reduce(flatten, [])
      .map(question => question.concept.id),
    'ALL',
  ];
}

function getAssignmentIds(course): string[] {
  return [
    ...course.assignments.map(assignment => assignment.id),
    'ALL',
  ];
}

function flatten(arr: any[], el: any): any[] {
  return arr.concat(Array.isArray(el) ? el.reduce(flatten, []) : el);
}

// Properties
async function changeCourseId(table: PrendusCourseQuestionRatings, course: object): boolean {
  const fulfilled = getListener(TABLE_LOADED, table);
  table.courseId = course.id;
  await fulfilled;
  return verifyTable(table, course);
}

function tableFilters(table, course) {
  const conceptIds = getConceptIds(course);
  const assignmentIds = getAssignmentIds(course);
  const assignmentArb = jsc.oneof(assignmentIds.map(id => jsc.constant(id)));
  const conceptArb = jsc.oneof(conceptIds.map(id => jsc.constant(id)));
  return jsc.forall(assignmentArb, conceptArb, async (assignmentId, conceptId) => {
    const assignmentLoaded = assignmentId === table.assignmentId
      ? Promise.resolve()
      : getListener(TABLE_LOADED, table);
    table.action = fireLocalAction(table.componentId, 'assignmentId', assignmentId);
    await assignmentLoaded;
    const conceptLoaded = conceptId === table.conceptId
      ? Promise.resolve
      : getListener(TABLE_LOADED, table);
    table.action = fireLocalAction(table.componentId, 'conceptId', conceptId);
    await conceptLoaded;
    const filtered = table.shadowRoot.querySelector('prendus-infinite-list').items;
    return verifyFilter(assignmentId, conceptId, filtered);
  });
}

function tableIsSortable(table, course) {
  const columns = [...Object.keys(DEFAULT_EVALUATION_RUBRIC), 'Overall',];
  const columnArb = jsc.oneof(columns.map(column => jsc.constant(column)));
  return jsc.forall(columnArb, jsc.bool, async (sortField, sortAsc) => {
    const columnLoaded = sortField === table.sortField
      ? Promise.resolve()
      : getListener(TABLE_LOADED, table);
    table.action = fireLocalAction(table.componentId, 'sortField', sortField);
    await columnLoaded;
    const loaded = sortAsc === table.sortAsc
      ? Promise.resolve()
      : getListener(TABLE_LOADED, table);
    table.action = fireLocalAction(table.componentId, 'sortAsc', sortAsc);
    await loaded;
    const sorted = table.shadowRoot.querySelector('prendus-infinite-list').items;
    return verifySort(sortField, sortAsc, sorted);
  });
}

function verifyTable(table: PrendusCourseQuestionRatings, course: object): boolean {
  const questions = course
    .assignments
    .map(assignment => assignment.questions)
    .reduce(flatten, []);
  return table.courseId === course.id
    && table.course.id === course.id
    && questions.every(
        question => table
        .shadowRoot
        .querySelector('prendus-infinite-list')
        .items
        .map(q => q.id)
        .indexOf(question.id) > -1
    )
    && table.assignmentId === 'ALL'
    && table.conceptId === 'ALL'
    && table.sortAsc === false
    && table.sortField === 'Overall';
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
