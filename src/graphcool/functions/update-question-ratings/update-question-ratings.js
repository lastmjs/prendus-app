const { fromEvent } = require('graphcool-lib');

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
    $overall: Int!
    $language: Int!
    $learningCategory: Int!
    $difficulty: Int!
    $conceptAlignment: Int!
    $inclusion: Int!,
    $plagiarism: Int!
  ) {
    UpdateQuestion(
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

module.exports = function (event) {
  const rating = event.QuestionRating.node;
  const averages = rating.scores.reduce(averageScore(rating.question), {});
  const values = Object.values(averages);
  const variables = {
    ...averages,
    overall: values.reduce((sum, num) => sum + num, 0) / (values.length || 1)
  };
  const api = fromEvent(event).api('simple/v1');
  api.request(update, variables).then(data => console.log(data));
  return {data: event.data};
};
