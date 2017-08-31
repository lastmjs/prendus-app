import {GQLRequest} from '../../../../src/node_modules/prendus-shared/services/graphql-service';
import {createUUID} from '../../../../src/node_modules/prendus-shared/services/utilities-service';
import {GQLVariables} from '../../../../src/typings/gql-variables';
import {RootReducer} from '../../../../src/redux/reducers';
import {PrendusCourseQuestionRatings} from '../../../../src/components/prendus-course-question-ratings/prendus-course-question-ratings';
import {DEFAULT_EVALUATION_RUBRIC} from '../../../../src/services/constants-service';

const jsc = require('jsverify');
const deepEqual = require('deep-equal');

//Test users and constants
const JWT = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE1MDQxOTcxNzMsImNsaWVudElkIjoiY2o1bDg3cmQwMzVoaTAxMzQ0bzAwNW5maCIsInByb2plY3RJZCI6ImNqNW12aXNoaW5ucGYwMTM0OG04Z3p0YjAiLCJwZXJtYW5lbnRBdXRoVG9rZW5JZCI6ImNqNzBvNXJldTA0ZmEwMTk4a2ZlNnkwaXIifQ.LbuydRKQjQgbMiMggFU-wOr-IKSxzcO5ZA5mAZGEUjU';
const studentId = 'cj70ofsne1dbq0100o06o4zoy';
const instructorId = 'cj70oeaw01b880100p9zjxsyo';
const TYPE_MAP = {
  scores: 'CategoryScore',
  concept: 'Concept',
  assignments: 'Assignment',
  questions: 'Question',
  ratings: 'QuestionRating',
  discipline: 'Discipline',
  subject: 'Subject'
};

//Utility functions
function handleError(err: any) {
  console.error(err);
}

async function saveCourse(course: Course): Course {
  return null;
}

function flatten(arr: any[]): any[] {
  return arr ? Array.prototype.concat.apply([], arr) : arr;
}

function labelledIds(obj: any, T: string): {label: string, id: string}[] {
  if (!obj || typeof obj !== 'object')
    return [];
  if (Array.isArray(obj))
    return obj.map(el => labelledIds(el, T));
  return flatten(
    Object.keys(obj)
    .filter(key => key != 'id')
    .map(key => labelledIds(obj[key], TYPE_MAP[key]))
  ).concat({type: T, id: obj.id});
}

function buildDeleteQuery(ids: {label: string, id: string}[]): string {
  const params = ids.map((node, i) => `$id${node.type + i}: ID!`).join(', ');
  return `
    mutation del(${params}) {
      ` + ids.map((node, i) => `
        ${node.type + i}: delete${node.type} (id: $id${node.type + i}) { id }
        `).join("\n") +
    `}
  `;
}

function buildDeleteVariables(ids: {label: string, id: string}[]): GQLVariables {
  return ids.reduce((result, node, i) => {
    return {...result, [node.label + i]: node.id}
  });
}

async function deleteCourse(course: Course) {
  const ids = labelledIds(course, 'Course');
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
  table.addEventListener('table-loaded', listener);
  return promise;
}

// Arbitraries
const categoryScoreArb = jsc.record({
  category: jsc.elements(Object.keys(DEFAULT_EVALUATION_RUBRIC)),
  score: jsc.nat(2)
});
const ratingArb = jsc.record({
  raterId: jsc.constant(studentId),
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
  code: jsc.asciinestring,
  concept: conceptArb,
  ratings: jsc.array(ratingArb),
  authorId: jsc.constant(studentId)
});
const assignmentArb = jsc.record({
  title: jsc.asciinestring,
  questions: jsc.array(questionArb),
  authorId: jsc.constant(instructorId)
});
const courseArb = jsc.record({
  title: jsc.asciinestring,
  assignments: jsc.small(jsc.array(assignmentArb))
});

//Properties
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

    test('Set course id without residual state', [courseArb], async (course: Course) => {
      const courseData = await saveCourse(course);
      const table = new PrendusCourseQuestionRatings();
      this.shadowRoot.appendChild(table);
      const fulfilled = setUpListener(table);
      table.courseId = courseData.id;
      console.log('awaiting', time());
      await fulfilled;
      console.log('waited', time());
      const success = verifyTable(table, courseData);
      this.shadowRoot.removeChild(table);
      await deleteCourse(courseData);
      return success;
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

    test('Set assignment id and concept id', [courseArb], async (course: Course) => {
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

    test('Sort columns', [courseArb], async (course: Course) => {
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
}

window.customElements.define(PrendusCourseQuestionRatingsTest.is, PrendusCourseQuestionRatingsTest)
