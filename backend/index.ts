import { GraphQLServer } from 'graphql-yoga';
import {makeExecutableSchema, mergeSchemas} from 'graphql-tools';
import { Prisma } from './generated/prisma';
import {readFileSync} from 'fs';
import {parse, print} from 'graphql';

//TODO prepare an automatic mapping of resolvers to the generated resolvers. I don't want to have to manually add each resolver. Do like we did in GraphSM
//TODO we can object spread the prepared resolvers into the Mutation and Query properties here, allowing us to add custom resolvers if we like
//TODO I don't know exactly how to handle the directive permissions...I would like to get away with not having to maintain two separate schemas...
//TODO I want Prisma to be like Graphcool as much as possible, but to still maintain the flexibility. One schema, one automatically generated set of resolvers, one location to add custom resolvers and directives

const PrismaDBConnection = new Prisma({
    endpoint: 'http://127.0.0.1:4466/backend/dev', // the endpoint of the Prisma DB service
    secret: 'mysecret123', // specified in database/prisma.yml //TODO obviously this should be controlled with environment variables
    debug: true, // log all GraphQL queries & mutations
});
const preparedQuery = prepareResolvers(PrismaDBConnection.query);
const preparedMutation = prepareResolvers(PrismaDBConnection.mutation);
const generatedResolvers = {
    Query: {
        ...preparedQuery
    },
    Mutation: {
        ...preparedMutation
    }
};
const generatedSchema = makeExecutableSchema({
    typeDefs: readFileSync('./generated/prisma.graphql').toString(),
    resolvers: generatedResolvers
});

const customSchema = makeExecutableSchema({
    typeDefs: `
        type Query {
            monkey: Int!
        }
    `,
    resolvers: {
        Query: {
            monkey: () => {
                return 5;
            }
        }
    }
});

const finalSchema = mergeSchemas({
    schemas: [generatedSchema, customSchema]
});

const server = new GraphQLServer({
    schema: finalSchema
});

server.start(() => console.log('Server is running on http://localhost:4000'));

function prepareResolvers(resolverObject) {
    return Object.entries(resolverObject).reduce((result, entry) => {
            const resolverName = entry[0];
            const resolverFunction = entry[1];

            console.log();

            return {
                ...result,
                [resolverName]: async (parent, args, context, info) => {
                    return await resolverFunction(args, info);
                }
            };
    }, {});
}
