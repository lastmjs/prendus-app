/**
 * If/When Graphcool supports more advanced use cases for nested orderBy fields
 * this subscription may become unneccessary. Specifically if they complete
 * the implementation of aggregated fields and the functionality to sort query
 * results on those averages, then this subscription will be unneccessary as long
 * as the query remains performant. If they don't support aggregated queries but do
 * support nested orderBy fields we could simplify this schema to have just one field
 * averageRatings: [CategoryScore!]!
 * and then include an orderBy field like this
 * allQuestions(orderBy: {
 *  averageRatings: {
 *    category: "Inclusion"
 *    score_asc
 *  }
 * }
 * To be clear. I don't know if Graphcool is planning to implement complex order by fields
 * in this way but I do know they are working on something to support aggregation queries and
 * complex ordering.
 */

import { fromEvent, FunctionEvent } from 'graphcool-lib'

const update = `
  mutation updateQuestionRatings(
    $id: ID!
    $overall: Float!
    $language: Float!
    $learningCategory: Float!
    $difficulty: Float!
    $conceptAlignment: Float!
    $inclusion: Float!,
    $plagiarism: Float!
  ) {
    updateQuestion(
      id: $id
      overall: $overall
      language: $language
      learningCategory: $learningCategory
      difficulty: $difficulty
      conceptAlignment: $conceptAlignment
      inclusion: $inclusion
      plagiarism: $plagiarism
    ) {
      id
    }
  }
`;

export default async (event: FunctionEvent) => {
  const rating = event.data.QuestionRating.node;
  const averages = rating.scores.reduce(averageScore(rating.question), {});
  const values = Object.keys(averages).map(k => averages[k]);
  const variables = {
    id: rating.question.id,
    ...averages,
    overall: values.reduce((sum, num) => sum + num, 0) / (values.length || 1)
  };
  const api = fromEvent(event).api('simple/v1');
  try {
    await api.request(update, variables);
    return { data: event.data };
  } catch(err) {
    return { error: err.message };
  }
};

function categoryCamelCase(category: string): string {
  return category
  .replace(/^(\w)/, (m, c) => c.toLowerCase())
  .replace(/\s+(\w)/g, (m, c) => c.toUpperCase());
}

function averageScore(question) {
  return (result, categoryScore) {
    const { category, score } = categoryScore;
    const { count } = question._ratingsMeta;
    const field = categoryCamelCase(category);
    if (!question.hasOwnProperty(field))
      return result;
    const oldAverage = question[field];
    const average = (oldAverage * count + score) / (count + 1);
    return {
      ...result,
      [field]: average
    };
  }
}

