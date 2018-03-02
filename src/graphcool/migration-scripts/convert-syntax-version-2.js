const migrate = require('./migrate');

const PAGE_SIZE = 1000;

try {
    migrate(PAGE_SIZE, countOriginalEntities, getOriginalEntities, buildMutations);
}
catch(error) {
    console.log(error);
}

async function countOriginalEntities(client) {
    const data = await client.request(`
        query {
          _allQuestionsMeta {
            count
          }
        }
     `);
    return data._allQuestionsMeta.count;
}

async function getOriginalEntities(client, cursor, pageSize) {
    const data = await client.request(`
        query($cursor: Int!, $pageSize: Int!) {
            allQuestions(
                skip: $cursor
                first: $pageSize
            ) {
                id
                text
            }
        }
    `, {
        cursor,
        pageSize
    });

    return data.allQuestions;
}

function buildMutations(questions) {
    return questions.reduce((result, question, index) => {
        const questionIdVariableKey = `questionId${index}`;
        const questionIdVariableValue = question.id;

        const questionTextVariableKey = `questionText${index}`;
        const questionTextVariableValue = transformText(question.text);

        return {
            ...result,
            mutationString: `${result.mutationString}
                updateQuestion${index}: updateQuestion(id: $questionId${index}, text: $questionText${index}) {
                    id
                }
            `,
            mutationVariables: {
                ...result.mutationVariables,
                [questionIdVariableKey]: questionIdVariableValue,
                [questionTextVariableKey]: questionTextVariableValue
            },
            mutationVariableTypes: {
                ...result.mutationVariableTypes,
                [questionIdVariableKey]: 'ID!',
                [questionTextVariableKey]: 'String!'
            }
        }
    }, {
        mutationString: '',
        mutationVariables: {}
    });
}

function transformText(oldText) {
    return transformTextRecursion(oldText, true, 1);
}

function transformTextRecursion(text, start, index) {
    if (start) {
        const transformedText = text.replace('[radio start]', `[radio${index}]`);
        const moreSymbols = transformedText.includes('[radio end]');
        return moreSymbols ? transformTextRecursion(transformedText, false, index) : transformedText;
    }
    else {
        const transformedText = text.replace('[radio end]', `[radio${index}]`);
        const moreSymbols = transformedText.includes('[radio start]');
        return moreSymbols ? transformTextRecursion(transformedText, true, index + 1) : transformedText;
    }
}
