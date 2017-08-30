import {GQLRequest} from '../../../../src/node_modules/prendus-shared/services/graphql-service';
import {GQLVariables} from '../../../../src/typings/gql-variables';
import {RootReducer} from '../../../../src/redux/reducers';
import {DEFAULT_EVALUATION_RUBRIC} from '../../../../src/services/constants-service';

const jsc = require('jsverify');

//Test users
const testInstructorId = '';
const testStudentId = '';
const JWT = '';

function handleError(err: any) {
  console.error(err);
}

async function saveCourses(courses: Course[]): Course[] {
  const variables = { userId: testInstructorId };
  const data = await GQLRequest(``, variables, JWT, handleError);
  return data.user.ownedCourses;
}

async function saveCourse(course: Course): Course {
  const data = await saveCourses([course]);
  return data[0];
}

function labelledIds(obj: {id: string}, label: string): string[][] {

}

function buildDeleteQuery(ids: string[][]): string {

}

function buildDeleteVariables(ids: string[][]): GQLVariables {

}

async function deleteCourse(course: Course) {
  const ids = labelledIds(course);
  const query = buildDeleteQuery(ids);
  const variables = buildDeleteVariables(ids);
  await GQLRequest(query, variables, JWT, handleError);
}

function setUpListener(table: PrendusCourseQuestionRatings): Promise {
  let _resolve, listener;
  const promise = new Promise((resolve, reject) => {
    _resolve = resolve;
  });
  listener = (e: Event) => {
    table.removeEventListener('table-loaded', listener);
    _resolve();
  }
  table.addEventListener(listener);
  return promise;
}

// Arbitraries
const categoryScoreArb = jsc.record({
  category: jsc.elements(Object.keys(DEFAULT_EVALUATION_RUBRIC)),
  score: jsc.nat(2)
});
const ratingArb = jsc.record({
  scores: jsc.array(categoryScoreArb)
});
const disciplineArb = jsc.record({
  title: jsc.asciinestring
});
const subjectArb = jsc.record({
  title: jsc.asciinestring,
  discipline: disciplineArb
});
const conceptArb = jsc.record({
  title: jsc.asciinestring
  subject: subjectArb
});
const questionArb = jsc.record({
  text: jsc.asciinestring,
  concept: conceptArb,
  ratings: jsc.array(ratingArb)
});
const assignmentArb = jsc.record({
  title: jsc.asciinestring,
  questions: jsc.array(questionArb)
});
const courseArb = jsc.record({
  title: jsc.asciinestring,
  assignments: jsc.array(assignmentArb)
});
const coursesArb = jsc.record({
  courses: jsc.nearray(courseArb)
});

class PrendusCourseQuestionRatingsTest extends Polymer.Element {

  static get is() { return 'prendus-course-question-ratings-test' }

  connectedCallback() {
    super.connectedCallback();
    this._fireLocalAction('table', this.shadowRoot.querySelector('#table'));
  }

  prepareTests(test) {

    test('Set course id without residual state', [courseArb], async (course) => {
      const table = new PrendusCourseQuestionRatings();
      this.shadowRoot.appendChild(table);
      const courseData = await saveCourse(course);
      const fulfilled = setUpListener(table);
      table.courseId = courseData.id;
      await fulfilled;
      const success = verifyTable(table, courseData);
      this.shadowRoot.removeChild(table);
      await deleteCourse(courseData);
      return success;
    });

    test('Set course id with residual state', [coursesArb], async (courses) => {
      const coursesData = await saveCourses(courses);
      let success = true;
      coursesData.forEach(course => {
        const fulfilled = setUpListener(this.table);
        this.table.courseId = courseId;
        await fulfilled;
        success = success && verifyTable(this.table, course);
      });
      await Promise.all(coursesData.map(deleteCourse));
      return success;
    });

    test('Set assignment id and concept id', [courseArb], async (course) => {
      const courseData = await saveCourse(course);
      const fulfilled = setUpListener(this.table);
      this.table.courseId = courseData.id;
      await fulfilled;
      let success = true;
      const conceptIds = ['All', ...this.table._concepts(courseData.assignments).map(concept => concept.id)];
      const assignmentIds = ['All', ...courseData.assignments.map(assignment => assignment.id)];
      assignmentIds.forEach(assignmentId => {
        conceptIds.forEach(conceptId => {
          const filter = this.table._makeFilter(assignmentId, conceptId);
          const filtered = this.table.questionStats.filter(filter);
          success = success && verifyFilter(assignmentId, conceptId, filtered);
        });
      });
      await deleteCourse(courseData);
      return success;
    });

    test('Sort columns', [courseArb], (course) => {
      const courseData = await saveCourse(course);
      const fulfilled = setUpListener(this.table);
      this.table.courseId = courseData.id;
      await fulfilled;
      let success = true;
      const columns = ['Overall', 'Student', ...Object.keys(DEFAULT_EVALUATION_RUBRIC)];
      columns.forEach(sortField => {
        [true, false].forEach(sortAsc => {
          const sort = this.table._makeSorter(sortField, sortAsc);
          const sorted = this.table.questionStats.sort(sort);
          success = success && verifySort(sortField, sortAsc, sorted);
        });
      });
      await deleteCourse(courseData);
      return success;
    });
  }

  stateChange(e: Event) {
    const state = e.detail.state.components[this.componentId];
    state && (this.table = state.table);
}

window.customElements.define(PrendusCourseQuestionRatingsTest.is, PrendusCourseQuestionRatingsTest)
