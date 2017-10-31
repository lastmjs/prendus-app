import {DEFAULT_EVALUATION_RUBRIC} from '../../../src/services/constants-service';

const jsc = require('jsverify');

export const escapedString = jsc.asciinestring.smap(str => str.replace(/\\|"/, ''), str => str);

export type GQLArbitrary = {
  type: string,
  [key: string]: any
};

export const CategoryScoreArb = jsc.record({
  type: jsc.constant('CategoryScore'),
  category: jsc.elements(Object.keys(DEFAULT_EVALUATION_RUBRIC)),
  score: jsc.nat(2)
});

export const QuestionRatingArb = jsc.record({
  type: jsc.constant('QuestionRating'),
  scores: jsc.nearray(CategoryScoreArb)
});

export const DisciplineArb = jsc.record({
  type: jsc.constant('Discipline'),
  title: escapedString
});

export const SubjectArb = jsc.record({
  type: jsc.constant('Subject'),
  title: escapedString,
  discipline: DisciplineArb
});

export const ConceptArb = jsc.record({
  type: jsc.constant('Concept'),
  title: escapedString
  subject: SubjectArb
});

export const QuestionArb = jsc.record({
  type: jsc.constant('Question'),
  text: escapedString,
  code: escapedString,
  concept: ConceptArb,
  ratings: jsc.nearray(QuestionRatingArb),
});

export const AssignmentArb = jsc.record({
  type: jsc.constant('Assignment'),
  title: escapedString,
  questions: jsc.nearray(QuestionArb),
});

export const CourseArb = jsc.record({
  type: jsc.constant('Course'),
  title: escapedString,
  assignments: jsc.small(jsc.nearray(AssignmentArb)),
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

