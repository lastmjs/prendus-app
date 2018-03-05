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
          _allQuestionsMeta(filter: {
              visibility: null
          }) {
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
                filter: {
                    visibility: null
                }
            ) {
                id
            }
        }
    `, {
        cursor: 0,
        pageSize
    });

    return data.allQuestions;
}

function buildMutations(questions) {
    return questions.reduce((result, question, index) => {
        const questionIdVariableKey = `questionId${index}`;
        const questionIdVariableValue = question.id;

        const questionVisibilityIdVariableKey = `questionVisibilityId${index}`;
        throw new Error('Make sure to enter the correct visibilityId');
        const questionVisibilityIdVariableValue = ``;

        return {
            ...result,
            mutationString: `${result.mutationString}
                updateQuestion${index}: updateQuestion(id: $${questionIdVariableKey}, visibilityId: $${questionVisibilityIdVariableKey}) {
                    id
                }
            `,
            mutationVariables: {
                ...result.mutationVariables,
                [questionIdVariableKey]: questionIdVariableValue,
                [questionVisibilityIdVariableKey]: questionVisibilityIdVariableValue
            },
            mutationVariableTypes: {
                ...result.mutationVariableTypes,
                [questionIdVariableKey]: 'ID!',
                [questionVisibilityIdVariableKey]: 'ID!'
            }
        }
    }, {
        mutationString: '',
        mutationVariables: {}
    });
}
