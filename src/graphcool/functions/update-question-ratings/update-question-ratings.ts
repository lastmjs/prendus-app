import { fromEvent, FunctionEvent } from 'graphcool-lib'

const categoryCamelCase = category =>
  category
  .replace(/^(\w)/, (m, c) => c.toLowerCase())
  .replace(/\s+(\w)/g, (m, c) => c.toUpperCase());

const averageScore = question => (result, categoryScore) => {
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
};

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

export default (event: FunctionEvent) => {
  const rating = event.data.QuestionRating.node;
  const averages = rating.scores.reduce(averageScore(rating.question), {});
  const values = Object.keys(averages).map(k => averages[k]);
  const variables = {
    id: rating.question.id,
    ...averages,
    overall: values.reduce((sum, num) => sum + num, 0) / (values.length || 1)
  };
  const api = fromEvent(event).api('simple/v1');
  return new Promise((resolve, reject) => {
    api.request(update, variables)
      .then(_ => resolve({ data: event.data }))
      .catch(error => reject({ error: error.message }) );
  });
};
