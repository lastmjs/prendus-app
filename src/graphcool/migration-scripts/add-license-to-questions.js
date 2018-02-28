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
              license: null
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
                    license: null
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

        const questionLicenseIdVariableKey = `questionLicenseId${index}`;
        throw new Error('Make sure to enter the correct licenseId');
        const questionLicenseIdVariableValue = ``;

        return {
            ...result,
            mutationString: `${result.mutationString}
                updateQuestion${index}: updateQuestion(id: $${questionIdVariableKey}, licenseId: $${questionLicenseIdVariableKey}) {
                    id
                }
            `,
            mutationVariables: {
                ...result.mutationVariables,
                [questionIdVariableKey]: questionIdVariableValue,
                [questionLicenseIdVariableKey]: questionLicenseIdVariableValue
            },
            mutationVariableTypes: {
                ...result.mutationVariableTypes,
                [questionIdVariableKey]: 'ID!',
                [questionLicenseIdVariableKey]: 'ID!'
            }
        }
    }, {
        mutationString: '',
        mutationVariables: {}
    });
}
