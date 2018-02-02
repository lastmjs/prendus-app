const { GraphQLClient } = require('graphql-request');

if (process.argv.length <= 3) {
  console.log("USAGE: node convert-syntax.js ENDPOINT AUTH_TOKEN");
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
const getQuestionsQuery = `
    query getQuestions($cursor: Int!) {
        questions: allQuestions(
            skip: $cursor
            first: ${PAGE_SIZE}
        ) {
            id
            text
            code
        }
    }
`;

try {
    (async () => {
        const totalNumQuestions = await getTotalNumQuestions();
        processQuestions(0, totalNumQuestions, PAGE_SIZE, getQuestionsQuery);
    })();
}
catch(error) {
    console.log(error);
}

async function processQuestions(cursor, count, pageSize, query) {
    const questions = (await client.request(query, { cursor })).questions;

    if (questions.length === 0) {
        console.clear();
        console.log(`${count}/${count}...Completed`);
        return;
    }

    console.clear();
    console.log(`${cursor}/${count}...`);

    const buildMutationsResult = buildMutations(questions);
    const updateQuery = `
        mutation(${buildVariableDefinitions(buildMutationsResult.mutationVariables)}) {
            ${buildMutationsResult.mutationString}
        }
    `;

    await client.request(updateQuery, buildMutationsResult.mutationVariables);
    await processQuestions(cursor + PAGE_SIZE, count, pageSize, query);
}

async function getTotalNumQuestions() {
    const data = await client.request(`
      query {
        _allQuestionsMeta {
          count
        }
      }`);
    return data._allQuestionsMeta.count;
}

function transformText(oldText) {
    return transformTextRecursion(oldText, true);
}

function transformCode(oldCode) {
    return oldCode.replace('Inclusion', 'Use in Test');
}

function transformTextRecursion(text, start) {
    if (start) {
        const transformedText = text.replace('[*]', '[radio start]').replace(' style="display: flex; align-items: start;"', '');
        const moreSymbols = transformedText.includes('[*]');
        return moreSymbols ? transformTextRecursion(transformedText, false) : transformedText;
    }
    else {
        const transformedText = text.replace('[*]', '[radio end]').replace(' style="display: flex; align-items: start;"', '');
        const moreSymbols = transformedText.includes('[*]');
        return moreSymbols ? transformTextRecursion(transformedText, true) : transformedText;
    }
}

function buildMutations(questions) {
    return questions.reduce((result, question, index) => {
        const questionIdVariableKey = `questionId${index}`;
        const questionIdVariableValue = question.id;

        const textVariableKey = `text${index}`;
        const textVariableValue = transformText(question.text);

        const codeVariableKey = `code${index}`;
        const codeVariableValue = transformCode(question.code);

        return {
            ...result,
            mutationString: `${result.mutationString}
                updateQuestion${index}: updateQuestion(id: $questionId${index}, text: $text${index}, code: $code${index}) {
                    id
                }
            `,
            mutationVariables: {
                ...result.mutationVariables,
                [questionIdVariableKey]: questionIdVariableValue,
                [textVariableKey]: textVariableValue,
                [codeVariableKey]: codeVariableValue
            }
        };
    }, {
        mutationString: '',
        mutationVariables: {}
    });
}

function buildVariableDefinitions(mutationVariables) {
    return Object.keys(mutationVariables).reduce((result, mutationVariableKey) => {
        const idType = mutationVariableKey.indexOf('questionId') === 0;
        const stringType = mutationVariableKey.indexOf('text') === 0 || mutationVariableKey.indexOf('code') === 0;

        if (idType) {
            return `${result} $${mutationVariableKey}: ID! `;
        }

        if (stringType) {
            return `${result} $${mutationVariableKey}: String! `;
        }

        return result;
    }, '');
}
