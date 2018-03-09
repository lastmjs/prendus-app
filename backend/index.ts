import { GraphQLServer } from 'graphql-yoga';
import {makeExecutableSchema, mergeSchemas} from 'graphql-tools';
import { Prisma, Query, Mutation } from './generated/prisma';
import {readFileSync} from 'fs';
import {parse, print, ObjectTypeDefinitionNode} from 'graphql';
import {signup} from './resolvers/signup';
import {userOwns} from './directive-resolvers/user-owns';
import {extractFragmentReplacements} from 'prisma-binding';

//TODO I don't know exactly how to handle the directive permissions...I would like to get away with not having to maintain two separate schemas...
//TODO I want Prisma to be like Graphcool as much as possible, but to still maintain the flexibility. One schema, one automatically generated set of resolvers, one location to add custom resolvers and directives

const originalSchemaAST = parse(readFileSync('./datamodel.graphql').toString());
const originalDirectiveDefinitions = originalSchemaAST.definitions.filter((originalSchemaDefinition) => {
    return originalSchemaDefinition.kind === 'DirectiveDefinition';
});
const generatedSchemaAST = parse(readFileSync('./generated/prisma.graphql').toString());
const generatedSchemaASTWithDirectives = {
    ...generatedSchemaAST,
    definitions: [...originalDirectiveDefinitions, ...generatedSchemaAST.definitions.map((generatedSchemaDefinition) => {
        const matchingSchemaDefinition: ObjectTypeDefinitionNode = <ObjectTypeDefinitionNode> originalSchemaAST.definitions.find((originalSchemaDefinition) => {
            return (
                originalSchemaDefinition.kind === 'ObjectTypeDefinition' &&
                generatedSchemaDefinition.kind === 'ObjectTypeDefinition' &&
                originalSchemaDefinition.name.kind === 'Name' &&
                generatedSchemaDefinition.name.kind === 'Name' &&
                originalSchemaDefinition.name.value === generatedSchemaDefinition.name.value
            );
        });

        return matchingSchemaDefinition || generatedSchemaDefinition;
    })]
};

const preparedFieldResolvers = addFragmentToFieldResolvers(parse(readFileSync('./datamodel.graphql').toString()), `{ id }`)
const generatedFragmentReplacements = extractFragmentReplacements(preparedFieldResolvers);
const PrismaDBConnection = new Prisma({
    endpoint: 'http://127.0.0.1:4466/backend/dev', // the endpoint of the Prisma DB service
    secret: 'mysecret123', // specified in database/prisma.yml //TODO obviously this should be controlled with environment variables
    debug: true, // log all GraphQL queries & mutations
    fragmentReplacements: generatedFragmentReplacements
});
const preparedTopLevelQueryResolvers = prepareTopLevelResolvers(PrismaDBConnection.query);
const preparedTopLevelMutationResolvers = prepareTopLevelResolvers(PrismaDBConnection.mutation);
const generatedResolvers = {
    Query: {
        ...preparedTopLevelQueryResolvers
    },
    Mutation: {
        ...preparedTopLevelMutationResolvers
    },
    ...preparedFieldResolvers
};
const generatedSchema = makeExecutableSchema({
    typeDefs: generatedSchemaASTWithDirectives,
    resolvers: generatedResolvers,
    directiveResolvers: {
        userOwns
    }
});

const customSchema = makeExecutableSchema({
    typeDefs: `
        scalar DateTime
        ${readFileSync('./datamodel.graphql')}

        type AuthPayload {
            token: String!
            user: User!
        }

        type Query {
            dummy: Int!
        }

        type Mutation {
            signup(email: String, password: String!): AuthPayload!
        }
    `,
    resolvers: {
        Query: {
        },
        Mutation: {
            signup
        }
    },
    directiveResolvers: { //TODO it is kind of redundant to have to put the directiveResolvers in here again. mergeSchemas should merge directives as well. See here: https://github.com/apollographql/graphql-tools/issues/603#issuecomment-371327254
        userOwns
    }
});

const finalSchema = mergeSchemas({
    schemas: [generatedSchema, customSchema]
});

const server = new GraphQLServer({
    schema: finalSchema,
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
