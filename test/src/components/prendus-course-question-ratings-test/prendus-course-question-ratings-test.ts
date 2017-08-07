import {GQLrequest} from '../../../../src/services/graphql-service';
import {RootReducer} from '../../../../src/redux/reducers';

const jsc = require('jsverify');

// Arbitraries
const ratingArb = jsc.record({
  ratingJson: jsc.json
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
  courses: jsc.array(courseArb)
});

class PrendusCourseQuestionRatingsTest extends Polymer.Element {

  static get is() { return 'prendus-course-question-ratings-test' }

  constructor() {
    super();
    this.rootReducer = RootReducer;
    this.userId = "cj5wuc7s61p4c0152633ivdrj"; //TODO: using hard coded user id for tests because it is hard to tap into the life cycle of test runner to do set up and tear down stuff.
  }

  async GQLUpdateTestUser(courses) {
    const mutation = `mutation makeTestCourses($userId: ID!, $courses: [Course!]!) {
      updateUser(
        id: $userId,
        ownedCourses: $courses
        ) {
        ownedCourses {
          id
          title
          assignments {
            id
            title
            questions {
              id
              concept {
                id
                title
              }
              ratings {
                alignment
                difficulty
                quality
              }
            }
          }
        }
      }
    }`;
    const variables = {courses}
    await GQLrequest(mutation, variables, '');
  }

  async _deleteNode(id) {
    const mutation = `mutation del($id: ID!) { deleteNode(id: $id) { id } }`;
    await GQLMutate(mutation, {id}, '');
  }

  async _tearDown(ids) {
    await Promise.all(ids.map(this._deleteNode));
  }

  _toIds(nodes) {
    const toIds = this._toIds.bind(this);
    return nodes.reduce((acc, node) => {
      acc.push(node.id);
      Object.keys(node).forEach(key => {
        if (Array.isArray(node[key])) acc.concat(toIds(node[key]));
        else if (node[key].id) acc.push(node[key].id);
      });
      return acc;
    });
  }

  prepareTests(test) {
    test('Returns true', [coursesArb], (courses) => {
      return true;
    });
  }
}

window.customElements.define(PrendusCourseQuestionRatingsTest.is, PrendusCourseQuestionRatingsTest)
