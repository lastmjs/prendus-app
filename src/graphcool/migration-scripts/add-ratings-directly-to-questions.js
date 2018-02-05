const { GraphQLClient } = require('graphql-request');

if (process.argv.length <= 3) {
  console.log("USAGE: node index.js ENDPOINT AUTH_TOKEN");
  process.exit(-1);
}

const PAGE_SIZE = 50;
const ENDPOINT = process.argv[2];
const AUTH_TOKEN = process.argv[3];
const client = new GraphQLClient(ENDPOINT, {
  headers: {
    Authorization: `Bearer ${AUTH_TOKEN}`
  }
});

const QUERY = `
  query getQuestions($cursor: Int!) {
    questions: allQuestions(
      skip: $cursor
      first: ${PAGE_SIZE}
    ) {
      id
      ratings {
        scores {
          category
          score
        }
      }
    }
  }
`;

const getQuestions = async cursor => {
  const data = await client.request(QUERY, { cursor });
  return data.questions;
};

const getCount = async () => {
  const data = await client.request(`
    query {
      _allQuestionsMeta {
        count
      }
    }`);
  return data._allQuestionsMeta.count;
};

const CATEGORIES = [
  'Language',
  'Learning Category',
  'Difficulty',
  'Concept Alignment',
  'Inclusion',
  'Plagiarism'
];

const categoryCamelCase = category =>
  category
  .replace(/^(\w)/, (m, c) => c.toLowerCase())
  .replace(/\s+(\w)/g, (m, c) => c.toUpperCase());

const sum = (s, i) => s + i;

const flatten = (acc, el) => acc.concat(Array.isArray(el) ? el.reduce(flatten, []) : el);

const filterScores = (ratings, category) => ratings
  .map(rating => rating.scores)
  .reduce(flatten, [])
  .filter(categoryScore => categoryScore.category === category)
  .map(({ score }) => score);

const calculateAverages = (question, i) => (result, category) => {
  const scores = filterScores(question.ratings, category);
  const average = scores.reduce(sum, 0) / (scores.length || 1);
  const field = categoryCamelCase(category);
  return {
    ...result,
    [`${field}${i}`]: average
  };
};

const calculateOverall = averages => {
  const values = Object.values(averages);
  return values.reduce(sum, 0) / (values.length || 1);
};

const calculateScores = (question, i) => {
  const averages = CATEGORIES.reduce(calculateAverages(question, i), {});
  const overall = calculateOverall(averages);
  return {
    ...averages,
    [`overall${i}`]: overall,
    [`question${i}`]: question.id
  };
};

const updateQuery = (question, i) => `
  update${i}: updateQuestion(
    id: $question${i}
    overall: $overall${i}
    language: $language${i}
    learningCategory: $learningCategory${i}
    difficulty: $difficulty${i}
    conceptAlignment: $conceptAlignment${i}
    inclusion: $inclusion${i}
    plagiarism: $plagiarism${i}
  ) {
    id
  }
`;

const updateQueryParams = l => (new Array(l)).fill(null)
  .map(
    (_, i) => CATEGORIES.map(
      category => `$${categoryCamelCase(category)}${i}: Float!`
    ).concat([`$question${i}: ID!`,`$overall${i}: Float!`])
  )
  .reduce(flatten, [])
  .join('\n');

const updateVariables = (variables, questionVariables) => ({ ...variables, ...questionVariables });

const run = async (cursor, count) => {
  const questions = await getQuestions(cursor);
  if (!questions.length)
    return true;
  console.clear();
  console.log(`${cursor}/${count}...`);
  const query = `
    mutation UpdateQuestionRatings(
      ${updateQueryParams(questions.length)}
    ) {
      ${questions.map(updateQuery).join('\n')}
    }
  `;
  const variables = questions.map(calculateScores).reduce(updateVariables, {});
  await client.request(query, variables);
  const done = await run(cursor + PAGE_SIZE, count);
  return done;
};

const main = async () => {
  const count = await getCount();
  await run(0, count);
};

main().catch(err => console.error(err));
