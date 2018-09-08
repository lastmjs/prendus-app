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
          _allUsersMeta(filter: {
              createAssignmentEditorChosen: false
          }) {
            count
          }
        }
     `);
    return data._allUsersMeta.count;
}

async function getOriginalEntities(client, cursor, pageSize) {
    const data = await client.request(`
        query($cursor: Int!, $pageSize: Int!) {
            allUsers(
                skip: $cursor
                first: $pageSize
                filter: {
                    createAssignmentEditorChosen: false
                }
            ) {
                id
            }
        }
    `, {
        cursor: 0,
        pageSize
    });

    return data.allUsers;
}

function buildMutations(users) {
    return users.reduce((result, user, index) => {
        const userIdVariableKey = `userId${index}`;
        const userIdVariableValue = user.id;

        return {
            ...result,
            mutationString: `${result.mutationString}
                updateUser${index}: updateUser(id: $${userIdVariableKey}, createAssignmentEditorChosen: true) {
                    id
                }
            `,
            mutationVariables: {
                ...result.mutationVariables,
                [userIdVariableKey]: userIdVariableValue
            },
            mutationVariableTypes: {
                ...result.mutationVariableTypes,
                [userIdVariableKey]: 'ID!'
            }
        }
    }, {
        mutationString: '',
        mutationVariables: {}
    });
}
