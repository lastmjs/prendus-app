const { GraphQLClient } = require('graphql-request');

if (process.argv.length <= 3) {
  console.log("USAGE: node convert-syntax.js ENDPOINT AUTH_TOKEN");
  process.exit(-1);
}

const ENDPOINT = process.argv[2];
const AUTH_TOKEN = process.argv[3];
const client = new GraphQLClient(ENDPOINT, {
  headers: {
    Authorization: `Bearer ${AUTH_TOKEN}`
  }
});

module.exports = async (pageSize, countOriginalEntities, getOriginalEntities, buildMutations) => {
    const totalNumEntities = await countOriginalEntities(client);
    await processEntities(0, totalNumEntities, pageSize, getOriginalEntities, buildMutations);
};

async function processEntities(cursor, count, pageSize, getOriginalEntities, buildMutations) {
    const entities = await getOriginalEntities(client, cursor, pageSize);

    if (entities.length === 0) {
        console.clear();
        console.log(`${count}/${count}...Completed`);
        return;
    }

    console.clear();
    console.log(`${cursor}/${count}...`);

    const buildMutationsResult = buildMutations(entities);
    const updateQuery = `
        mutation(${buildVariableDefinitions(buildMutationsResult.mutationVariables, buildMutationsResult.mutationVariableTypes)}) {
            ${buildMutationsResult.mutationString}
        }
    `;

    await client.request(updateQuery, buildMutationsResult.mutationVariables);
    await processEntities(cursor + pageSize, count, pageSize, getOriginalEntities, buildMutations);
}

function buildVariableDefinitions(mutationVariables, mutationVariableTypes) {
    return Object.keys(mutationVariables).reduce((result, mutationVariableKey) => {
        const mutationVariableType = mutationVariableTypes[mutationVariableKey];
        return `${result} $${mutationVariableKey}: ${mutationVariableType}`;
    }, '');
}
