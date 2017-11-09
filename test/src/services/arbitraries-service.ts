import {DEFAULT_EVALUATION_RUBRIC} from '../../../src/services/constants-service';

const jsc = require('jsverify');

export const escapedString = jsc.asciinestring.smap(str => str.replace(/\\|"/, ''), str => str);

export const CategoryScoreArb = jsc.record({
  category: jsc.elements(Object.keys(DEFAULT_EVALUATION_RUBRIC)),
  score: jsc.nat(2)
});
export const QuestionRatingArb = jsc.record({
  scores: jsc.nearray(CategoryScoreArb)
});
export const DisciplineArb = jsc.record({
  title: escapedString
});
export const SubjectArb = jsc.record({
  title: escapedString,
  discipline: DisciplineArb
});
export const ConceptArb = jsc.record({
  title: escapedString
  subject: SubjectArb
});
export const QuestionArb = jsc.record({
  text: escapedString,
  code: escapedString,
  concept: ConceptArb,
  ratings: jsc.small(jsc.array(QuestionRatingArb)),
});
export const AssignmentArb = jsc.record({
  title: escapedString,
  questions: jsc.array(QuestionArb),
});
export const CourseArb = jsc.record({
  title: escapedString,
  assignments: jsc.small(jsc.array(AssignmentArb)),
});
export const RubricCategoryArb = jsc.pair(
  jsc.array(escapedString),
  jsc.array(
    jsc.record({
      description: escapedString,
      points: jsc.nat,
    })
  )
).smap(
  pair => (pair[0].length > pair[1].length ? pair[1] : pair[0]).reduce(
    (scales, _, i) => ({ ...scales, [pair[0][i]]: pair[1][i] }),
    {}
  ),
  category => [Object.keys(category), Object.values(category)]
);
export const RubricArb = jsc.pair(
  jsc.array(escapedString),
  jsc.array(RubricCategoryArb)
).smap(
  pair => (pair[0].length > pair[1].length ? pair[1] : pair[0]).reduce(
    (rubric, _, i) => ({ ...rubric, [pair[0][i]]: pair[1][i] }),
    {}
  ),
  rubric => [Object.keys(rubric), Object.values(rubric)]
);
