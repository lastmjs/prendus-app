import {createUUID} from '../../../../src/node_modules/prendus-shared/services/utilities-service';
import {RootReducer} from '../../../../src/redux/reducers';
import {PrendusCourseQuestionRatings} from '../../../../src/components/prendus-course-question-ratings/prendus-course-question-ratings';
import {DEFAULT_EVALUATION_RUBRIC} from '../../../../src/services/constants-service';
import {CourseArb} from '../../services/arbitraries-service';
import {saveArbitrary, authenticateTestUser, deleteTestUsers} from '../../services/dataGen-service';

class PrendusCourseQuestionRatingsTest extends Polymer.Element {

  static get is() { return 'prendus-course-question-ratings-test' }

  constructor() {
    super();
    this.componentId = createUUID();
    this.rootReducer = RootReducer;
  }

  connectedCallback() {
    super.connectedCallback();
    this.action = {
      type: 'SET_COMPONENT_PROPERTY',
      componentId: this.componentId,
      key: 'table',
      value: this.shadowRoot.querySelector('#table')
    };
  }

  prepareTests(test) {

    test('Set course id without residual state', [CourseArb], async (course: Course) => {
      const student = await authenticateTestUser('STUDENT');
      const instructor = await authenticateTestUser('INSTRUCTOR');
      const ids = await saveArbitrary(course);
      await deleteTestUsers(student, instructor);
      return true;
      //      const courseData = await saveCourse(course);
      //      const table = new PrendusCourseQuestionRatings();
      //      this.shadowRoot.appendChild(table);
      //      const fulfilled = setUpListener(table);
      //      table.courseId = courseData.id;
      //      console.log('awaiting', time());
      //      await fulfilled;
      //      console.log('waited', time());
      //      const success = verifyTable(table, courseData);
      //      this.shadowRoot.removeChild(table);
      //      await deleteCourse(courseData);
      //      return success;
    });

    //    test('Set course id with residual state', [coursesArb], async (courses: Courses) => {
    //      const coursesData = await saveCourses(courses);
    //      console.log(coursesData);
    //      let success = true;
    //      coursesData.forEach(async (course) => {
    //        const fulfilled = setUpListener(this.table);
    //        this.table.courseId = courseId;
    //        await fulfilled;
    //        success = success && verifyTable(this.table, course);
    //      });
    //      await Promise.all(coursesData.map(deleteCourse));
    //      return success;
    //    });

    //    test('Set assignment id and concept id', [courseArb], async (course: Course) => {
    //      const courseData = await saveCourse(course);
    //      const fulfilled = setUpListener(this.table);
    //      this.table.courseId = courseData.id;
    //      await fulfilled;
    //      let success = true;
    //      const conceptIds = ['All', ...this.table._concepts(courseData.assignments).map(concept => concept.id)];
    //      const assignmentIds = ['All', ...courseData.assignments.map(assignment => assignment.id)];
    //      assignmentIds.forEach(assignmentId => {
    //        conceptIds.forEach(conceptId => {
    //          const filter = this.table._makeFilter(assignmentId, conceptId);
    //          const filtered = this.table.questionStats.filter(filter);
    //          success = success && verifyFilter(assignmentId, conceptId, filtered);
    //        });
    //      });
    //      await deleteCourse(courseData);
    //      return success;
    //    });
    //
    //    test('Sort columns', [courseArb], async (course: Course) => {
    //      const courseData = await saveCourse(course);
    //      const fulfilled = setUpListener(this.table);
    //      this.table.courseId = courseData.id;
    //      await fulfilled;
    //      let success = true;
    //      const columns = ['Overall', 'Student', ...Object.keys(DEFAULT_EVALUATION_RUBRIC)];
    //      columns.forEach(sortField => {
    //        [true, false].forEach(sortAsc => {
    //          const sort = this.table._makeSorter(sortField, sortAsc);
    //          const sorted = this.table.questionStats.sort(sort);
    //          success = success && verifySort(sortField, sortAsc, sorted);
    //        });
    //      });
    //      await deleteCourse(courseData);
    //      return success;
    //    });
  }

  stateChange(e: Event) {
    const state = e.detail.state.components[this.componentId];
    state && (this.table = state.table);
  }
}

// Arbitraries

// Utils
function setUpListener(table: PrendusCourseQuestionRatings): Promise {
  let _resolve, listener;
  const promise = new Promise((resolve, reject) => {
    _resolve = resolve;
  });
  listener = (e: Event) => {
    table.removeEventListener('table-loaded', listener);
    _resolve();
  }
  table.addEventListener('table-loaded', listener);
  return promise;
}

// Properties
function verifyTable(table: PrendusCourseQuestionRatings, course: Course): boolean {
  return table.courseId === course.id
    && table.assignmentId === 'All'
    && table.conceptId === 'All'
    && table.sortAsc === false
    && table.sortField === 'Overall'
    && deepEqual(table.course, course)
}

function verifyFilter(assignmentId: number, conceptId: number, filtered: QuestionRatingStats[]): boolean {
  return (assignmentId === 'All' || !filtered.some(stats => stats.assignmentId != assignmentId))
    && (conceptId === 'All' || !filtered.some(stats => stats.conceptId != conceptId));
}

function weightedSum(sum, num, i) {
  return sum + num*i;
}

function verifySort(sortField: number, sortAsc: number, sorted: QuestionRatingStats[]): boolean {
  return sorted.reduce((result, next, i) => {
    if (!i) return true;
    const prev = sorted[i-1];
    const prevStat = prev.stats[sortField] ? prev.stats[sortField].reduce(weightedSum, 0) : 0;
    const nextStat = next.stats[sortField] ? next.stats[sortField].reduce(weightedSum, 0) : 0;
    if (sortAsc) {
      if (sortField === 'Student') return result && prev.student.toLowerCase() <= next.student.toLowerCase();
      else if (sortField === 'Overall') return result && Number(prev.overall) <= Number(next.overall);
      return result && prevStat <= nextStat;
    }
    else {
      if (sortField === 'Student') return result && prev.student.toLowerCase() >= next.student.toLowerCase();
      else if (sortField === 'Overall') return result && Number(prev.overall) >= Number(next.overall);
      return result && prevStat >= nextStat;
    }
  }, true);
}

window.customElements.define(PrendusCourseQuestionRatingsTest.is, PrendusCourseQuestionRatingsTest)
