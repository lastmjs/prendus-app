import {GQLQuery, GQLMutate, escapeString} from '../../../../src/services/graphql-service';
import {RootReducer} from '../../../../src/redux/reducers';

const jsc = require('jsverify');

// Arbitraries
const ratingArb = jsc.record({
  quality: jsc.nat(10),
  alignment: jsc.nat(10),
  difficulty: jsc.nat(10)
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

  async GQLUpdateTestUser(arbObject) {
    const makeQueryStr = this._arbToGQLQuery.bind(this); // 'this' gets corrupted when function is called recursively
    const queryStr = Array.isArray(arbObject) ? arbObject.map(makeQueryStr).join(",") : makeQueryStr(arbObject);
    const mutation = `mutation {
      updateUser(
        id: "${this.userId}",
        ownedCourses: [${queryStr}]
        ) {
        ownedCourses {
          id
          title
          assignments {
            id
            title
            questions {
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
    }`
    return GQLMutate(mutation, '', null);
  }

  _arbToGQLQuery(obj) {
    const makeQuery = this._arbToGQLQuery.bind(this);
    return "{" + Object.keys(obj).map(key => {
      const prefix = key + ": ";
      if (typeof obj[key] === 'string') return prefix + "\"" + obj[key].replace(/"/g, '').replace(/\\/g, '') + "\"";
      if (typeof obj[key] === 'number') return prefix + obj[key];
      if (Array.isArray(obj[key])) return prefix + "[" + obj[key].map(makeQuery).join(", ") + "]";
      return prefix + makeQuery(obj[key]);
    }).join(", ") + "}";
  }

  prepareTests(test) {
    test('Returns true', [courseArb], (course) => {
      return true;
    });
    test('Returns true', [coursesArb], (courses) => {
      return true;
    });

  }
}

window.customElements.define(PrendusCourseQuestionRatingsTest.is, PrendusCourseQuestionRatingsTest)
