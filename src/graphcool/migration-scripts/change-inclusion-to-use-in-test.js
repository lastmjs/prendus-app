const migrate = require('./migrate');

const PAGE_SIZE = 50;

try {
    migrate(50, countOriginalEntities, getOriginalEntities, buildMutations);
}
catch(error) {
    console.log(error);
}

async function countOriginalEntities(client) {
    const data = await client.request(`
      query {
        _allCategoryScoresMeta(filter: {
            category: "Inclusion"
        }) {
          count
        }
      }`);
    return data._allCategoryScoresMeta.count;
}

async function getOriginalEntities(client, cursor, pageSize) {
    const data = await client.request(`
        query($cursor: Int!, $pageSize: Int!) {
            allCategoryScores(
                skip: $cursor
                first: $pageSize
                filter: {
                    category: "Inclusion"
                }
            ) {
                id
                category
            }
        }
    `, {
        cursor: 0,
        pageSize
    });

    return data.allCategoryScores;
}

function buildMutations(categoryScores) {
    return categoryScores.reduce((result, categoryScore, index) => {
        const categoryScoreIdVariableKey = `categoryScoreId${index}`;
        const categoryScoreIdVariableValue = categoryScore.id;

        const categoryScoreCategoryKey = `categoryScoreCategory${index}`;
        const categoryScoreCategoryValue = 'Use in Test';

        return {
            ...result,
            mutationString: `${result.mutationString}
                updateCategoryScore${index}: updateCategoryScore(id: $categoryScoreId${index}, category: $categoryScoreCategory${index}) {
                    id
                }
            `,
            mutationVariables: {
                ...result.mutationVariables,
                [categoryScoreIdVariableKey]: categoryScoreIdVariableValue,
                [categoryScoreCategoryKey]: categoryScoreCategoryValue
            },
            mutationVariableTypes: {
                ...result.mutationVariableTypes,
                [categoryScoreIdVariableKey]: 'ID!',
                [categoryScoreCategoryKey]: 'String!'
            }
        }
    }, {
        mutationString: '',
        mutationVariables: {}
    });
}
