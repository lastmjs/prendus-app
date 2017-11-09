import {DEFAULT_EVALUATION_RUBRIC} from '../../../src/services/constants-service';

const jsc = require('jsverify');

const escapedString = jsc.asciinestring.smap(str => str.replace(/\\|"/, ''), str => str);

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
  ratings: jsc.array(QuestionRatingArb),
});
export const AssignmentArb = jsc.record({
  title: escapedString,
  questions: jsc.array(QuestionArb),
});
export const CourseArb = jsc.record({
  title: escapedString,
  assignments: jsc.small(jsc.array(AssignmentArb)),
});

