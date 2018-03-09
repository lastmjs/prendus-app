import {GraphQLServer} from 'graphql-yoga';
import {makeExecutableSchema} from 'graphql-tools';
import {
    Prisma,
    Query,
    Mutation
} from './generated/prisma';
import {readFileSync} from 'fs';
import {
    parse,
    print,
    ObjectTypeDefinitionNode
} from 'graphql';
import {
    signupResolver
} from './resolvers';
import {
    userOwnsDirectiveResolver,
    privateDirectiveResolver,
    authenticatedDirectiveResolver
} from './directive-resolvers';
import {extractFragmentReplacements} from 'prisma-binding';
import {mergeTypes} from 'merge-graphql-schemas';

//TODO I don't know exactly how to handle the directive permissions...I would like to get away with not having to maintain two separate schemas...
//TODO I want Prisma to be like Graphcool as much as possible, but to still maintain the flexibility. One schema, one automatically generated set of resolvers, one location to add custom resolvers and directives

// const originalSchemaAST = parse(readFileSync('./datamodel.graphql').toString());
// const originalDirectiveDefinitions = originalSchemaAST.definitions.filter((originalSchemaDefinition) => {
//     return originalSchemaDefinition.kind === 'DirectiveDefinition';
// });
// const generatedSchemaAST = parse(readFileSync('./generated/prisma.graphql').toString());
// const generatedSchemaASTWithDirectives = {
//     ...generatedSchemaAST,
//     definitions: [...originalDirectiveDefinitions, ...generatedSchemaAST.definitions.map((generatedSchemaDefinition) => {
//         const matchingSchemaDefinition: ObjectTypeDefinitionNode = <ObjectTypeDefinitionNode> originalSchemaAST.definitions.find((originalSchemaDefinition) => {
//             return (
//                 originalSchemaDefinition.kind === 'ObjectTypeDefinition' &&
//                 generatedSchemaDefinition.kind === 'ObjectTypeDefinition' &&
//                 originalSchemaDefinition.name.kind === 'Name' &&
//                 generatedSchemaDefinition.name.kind === 'Name' &&
//                 originalSchemaDefinition.name.value === generatedSchemaDefinition.name.value
//             );
//         });
//
//         return matchingSchemaDefinition || generatedSchemaDefinition;
//     })]
// };

const preparedFieldResolvers = addFragmentToFieldResolvers(parse(readFileSync('./schema/datamodel.graphql').toString()), `{ id }`)
const generatedFragmentReplacements = extractFragmentReplacements(preparedFieldResolvers);
const PrismaDBConnection = new Prisma({
    endpoint: 'http://127.0.0.1:4466/backend/dev', // the endpoint of the Prisma DB service
    secret: 'mysecret123', // specified in database/prisma.yml //TODO obviously this should be controlled with environment variables
    debug: true, // log all GraphQL queries & mutations
    fragmentReplacements: generatedFragmentReplacements
});
const preparedTopLevelQueryResolvers = prepareTopLevelResolvers(PrismaDBConnection.query);
const preparedTopLevelMutationResolvers = prepareTopLevelResolvers(PrismaDBConnection.mutation);

const resolvers = {
    Query: {
        ...preparedTopLevelQueryResolvers
    },
    Mutation: {
        ...preparedTopLevelMutationResolvers,
        signup: signupResolver
    },
    ...preparedFieldResolvers
};
const directiveResolvers = {
    userOwns: userOwnsDirectiveResolver,
    authenticated: authenticatedDirectiveResolver,
    private: privateDirectiveResolver
};
// const generatedSchema = makeExecutableSchema({
//     typeDefs: generatedSchemaASTWithDirectives,
//     resolvers: generatedResolvers,
//     directiveResolvers
// });

// const customSchema = makeExecutableSchema({
//     typeDefs: `
//         scalar DateTime
//         ${readFileSync('./datamodel.graphql')}
//
//         type AuthPayload {
//             token: String!
//             user: User!
//         }
//
//         type Query {
//             dummy: Int!
//         }
//
//         type Mutation {
//             signup(email: String, password: String!): AuthPayload!
//         }
//     `,
//     // typeDefs: `
//     //     ${readFileSync('./datamodel.graphql')}
//     //     ${readFileSync('./dataops.graphql').toString()}
//     // `,
//     // resolvers: {
//     //     Query: {
//     //     },
//     //     Mutation: {
//     //         signup
//     //     }
//     // },
//     directiveResolvers
// });
//
// const finalSchema = mergeSchemas({
//     schemas: [generatedSchema, customSchema]
// });

// const finalSchema = mergeSchemas({
//     schemas: [
//         readFileSync('./datamodel.graphql').toString(),
//         readFileSync('./dataops.graphql').toString(),
//         readFileSync('./generated/prisma.graphql').toString()
//     ]
// });

const ultimateSchemaString = mergeTypes([
    readFileSync('./schema/datamodel.graphql').toString(),
    readFileSync('./schema/dataops.graphql').toString(),
    readFileSync('./schema/directives.graphql').toString(),
    readFileSync('./generated/prisma.graphql').toString()
], {
    all: true
});
const ultimateSchema = makeExecutableSchema({
    typeDefs: ultimateSchemaString,
    resolvers,
    directiveResolvers
});

console.log('ultimateSchemaString', ultimateSchemaString);

const server = new GraphQLServer({
    schema: ultimateSchema,
    context: (req) => {
        return {
            ...req,
            db: PrismaDBConnection
        };
    }
});

server.start(() => console.log('Server is running on http://localhost:4000'));

function prepareTopLevelResolvers(resolverObject: Query | Mutation) {
    return Object.entries(resolverObject).reduce((result, entry) => {
            const resolverName = entry[0];
            const resolverFunction = entry[1];
            return {
                ...result,
                [resolverName]: async (parent, args, context, info) => {
                    return await resolverFunction(args, info);
                }
            };
    }, {});
}

function addFragmentToFieldResolvers(schemaAST, fragmentSelection) {
    return schemaAST.definitions.reduce((result, schemaDefinition) => {
        if (schemaDefinition.kind === 'ObjectTypeDefinition') {
            return {
                ...result,
                [schemaDefinition.name.value]: schemaDefinition.fields.reduce((result, fieldDefinition) => {
                    //TODO this includes check is naive and will break for some strings
                    if (fragmentSelection.includes(fieldDefinition.name.value)) {
                        return result;
                    }

                    return {
                        ...result,
                        [fieldDefinition.name.value]: {
                            fragment: `fragment Fragment on ${schemaDefinition.name.value} ${fragmentSelection}`,
                            resolve: (parent, args, context, info) => {
                                return parent[fieldDefinition.name.value];
                            }
                        }
                    };
                }, {})
            };
        }
        else {
            return result;
        }
    }, {});
}
