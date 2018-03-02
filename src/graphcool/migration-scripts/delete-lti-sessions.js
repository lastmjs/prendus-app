const migrate = require('./migrate');

const PAGE_SIZE = 1000;

try {
    migrate(1000, countOriginalEntities, getOriginalEntities, buildMutations);
}
catch(error) {
    console.log(error);
}

async function countOriginalEntities(client) {
    const data = await client.request(`
      query {
        _allLTISessionsMeta(filter: {
            createdAt_lt: "2018-02-01"
        }) {
          count
        }
      }`);
    return data._allLTISessionsMeta.count;
}

async function getOriginalEntities(client, cursor, pageSize) {
    const data = await client.request(`
        query($cursor: Int!, $pageSize: Int!) {
            allLTISessions(
                skip: $cursor
                first: $pageSize
                filter: {
                    createdAt_lt: "2018-02-01"
                }
            ) {
                id
            }
        }
    `, {
        cursor: 0,
        pageSize
    });

    return data.allLTISessions;
}

function buildMutations(ltiSessions) {
    return ltiSessions.reduce((result, ltiSession, index) => {
        const ltiSessionIdVariableKey = `ltiSessionId${index}`;
        const ltiSessionIdVariableValue = ltiSession.id;

        return {
            ...result,
            mutationString: `${result.mutationString}
                deleteLTISession${index}: deleteLTISession(id: $ltiSessionId${index}) {
                    id
                }
            `,
            mutationVariables: {
                ...result.mutationVariables,
                [ltiSessionIdVariableKey]: ltiSessionIdVariableValue
            },
            mutationVariableTypes: {
                ...result.mutationVariableTypes,
                [ltiSessionIdVariableKey]: 'ID!'
            }
        }
    }, {
        mutationString: '',
        mutationVariables: {}
    });
}
