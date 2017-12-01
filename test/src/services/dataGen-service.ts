import {
  User,
  Course
} from '../../../../src/typings/index.d';
import {schema} from '../graphcool/testSchema';
import {GQLRequest} from '../../../../src/node_modules/prendus-shared/services/graphql-service';

const {
  getNamedType,
  GraphQLObjectType,
} = require('graphql');

const AUTH_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE1MDQxOTcxNzMsImNsaWVudElkIjoiY2o1bDg3cmQwMzVoaTAxMzQ0bzAwNW5maCIsInByb2plY3RJZCI6ImNqNW12aXNoaW5ucGYwMTM0OG04Z3p0YjAiLCJwZXJtYW5lbnRBdXRoVG9rZW5JZCI6ImNqNzBvNXJldTA0ZmEwMTk4a2ZlNnkwaXIifQ.LbuydRKQjQgbMiMggFU-wOr-IKSxzcO5ZA5mAZGEUjU';

const dependencyTree = [
  'Discipline',
  'Subject',
  'Concept',
  'Question',
  'Quiz',
  'QuestionResponse',
  'QuestionResponseRating',
  'UserEssay',
  'CategoryScore',
  'QuestionRating',
  'Assignment',
  'Course'
];

function dependencySort(typeA, typeB): number {
  return dependencyTree.indexOf(typeA) < dependencyTree.indexOf(typeB) ? 1 : -1;
}

export async function saveArbitrary(arb, name: string): Promise<object> {
  const mut = schema.getMutationType().getFields()[name];
  const gql = mutation(arb, mut, name);
  const data = await GQLRequest(gql, arb, AUTH_TOKEN, handleError);
  return data[name];
}

export async function deleteArbitrary(data, name: string) {
  const mut = schema.getMutationType().getFields()[name];
  const typedIds = flattenTypedIds(data, mut.type);
  const variables = deleteVariables(typedIds);
  const gql = deleteGql(typedIds);
  return GQLRequest(gql, variables, AUTH_TOKEN, handleError);
}

function operationParameters(arb, mut) {
  return Object.keys(arb)
    .map(field => {
      const i = mut.args.findIndex(arg => arg.name === field);
      if (i === -1)
        throw new Error(`Field ${field} is not in type ${mut.type.toString()}`);
      return `$${field}: ${mut.args[i].type.toString()}`;
    })
    .join('\n');
}

function mutationParameters(arb, mut) {
  return Object.keys(arb)
    .map(field => {
      if (!mut.args.some(arg => arg.name === field))
        throw new Error(`Field ${field} is not in type ${mut.type.toString()}`);
      return `${field}: $${field}`;
    })
    .join('\n');
}

function mutationSelections(arb, type, name) {
  if (Array.isArray(arb)) {
    if (arb.length)
      return arb
        .map(el => mutationSelections(el, type, name))
        .reduce((max, str) => str.length > max.length ? str : max, '');
    else if (getNamedType(type) instanceof GraphQLObjectType)
      return `${name} {id}\n`
    else
      return `${name}\n`;
  }
  else if (typeof arb !== 'object')
    return `${name}\n`;
  const gqlFields = getNamedType(type).getFields();
  const fields = Object.keys(arb).filter(field => Boolean(gqlFields[field]));
  const selections = fields
    .map(
      field => mutationSelections(arb[field], gqlFields[field].type, field)
    )
    .join('\n');
  return `
    ${name} {
      id
      ${selections}
    }
  `;
}

function mutation(arb, mut, name) {
  return `mutation saveArbitrary(
    ${operationParameters(arb, mut)}
  ) {
    ${name} (
      ${mutationParameters(arb, mut)}
    ) ${mutationSelections(arb, mut.type, '')}
  }
  `;
}

function deleteVariables(typedIds) {
  return typedIds.reduce(
    (result, { type, id }) => ({
      ...result,
      [id]: id
    }),
    {}
  );
}

function deleteGql(typedIds) {
  const params = typedIds.map(({ id }) => `$${id}: ID!`).join(', ');
  return `
    mutation del(${params}) {
      ` + typedIds
    .map(
      ({ type, id }, i) => `
        ${type}${i}: delete${type}(id: $${id}) {
          id
        }
      `
    )
    .join("\n")
      + `
    }
  `;
}

function flattenTypedIds(data, type) {
  if (Array.isArray(data))
    return data
      .map(datum => flattenTypedIds(datum, type))
      .reduce(flatten, []);
  const rawType = getNamedType(type);
  if (!(rawType instanceof GraphQLObjectType))
    return [];
  const fields = rawType.getFields();
  return Object.keys(data).reduce(
    (result, k) => {
      if (!data[k])
        return result;
      return k === 'id'
        ? [ ...result, { type: rawType.name, id: data.id } ]
        : [ ...result, ...flattenTypedIds(data[k], fields[k].type) ]
    },
    []
  )
    .reduce((filtered, typedId) => (filtered.some(({ id }) => id === typedId.id) ? filtered : [...filtered, typedId]), [])
    .sort((a, b) => dependencySort(a.type, b.type));
}

export async function createTestUser(role: string, name: string): Promise<User> {
  const email = `test-${role}${name || ''}@test-prendus.com`;
  const data = await GQLRequest(`mutation create($email: String!) {
    signupUser(email: $email, password: "test") {
      id
    }
    authenticateUser(email: $email, password: "test") {
      token
    }
  }`, {email}, AUTH_TOKEN, handleError);
  const id = data.signupUser.id;
  await GQLRequest(`mutation update($id: ID!, $role: UserRole!) {
    updateUser(id: $id, role: $role) {
      id
      role
    }
  }`, {id, role}, AUTH_TOKEN, handleError);
  return {
    id: data.signupUser.id,
    role,
    token: data.authenticateUser.token
  }
}

export async function deleteTestUsers(...users: User[]): Promise<object> {
  const params = users.map((user, i) => `$user${i}: ID!`).join(', ');
  const query = `
    mutation del(${params}) {
      ` + users.map((user, i) => `user${i}: deleteUser(id: $user${i}) { id }`) + `
    }
  `;
  const variables = users.reduce((result, user, i) => {
    return {
      ...result,
      [`user${i}`]: user.id
    }
  }, {});
  await GQLRequest(query, variables, AUTH_TOKEN, handleError);
}

export async function deleteCourseArbitrary(courseId: string): Promise<object> {
  const data = await GQLRequest(`
    query getCourse($courseId: ID!) {
      Course(id: $courseId) {
        id
        assignments {
          id
          analytics {
            id
          }
          questions {
            id
            quiz {
              id
            }
            ratings {
              id
              scores {
                id
              }
            }
            responses {
              id
              ratings {
                id
                scores {
                  id
                }
              }
              userEssays {
                id
              }
            }
            concept {
              id
              subject {
                id
                discipline {
                  id
                }
              }
            }
            analytics {
              id
            }
          }
        }
        purchases {
          id
        }
      }
    }
  `, { courseId }, AUTH_TOKEN, handleError);
  return deleteArbitrary(data.Course, 'createCourse');
}

export async function authorizeTestUserOnCourse(userId: string, courseId: string): Promise<object> {
  const data = await GQLRequest(`
    mutation authorizeUserOnCourse($userId: ID!, $courseId: ID!) {
      addToStudentsAndCourses(
        enrolledCoursesCourseId: $courseId,
        enrolledStudentsUserId: $userId
      ) {
        enrolledStudentsUser {
          id
        }
      }
      createPurchase(
        amount: 1000,
        stripeTokenId: "fake-token-for-testing",
        userId: $userId,
        courseId: $courseId
      ) {
        id
      }
    }
  `, { userId, courseId }, AUTH_TOKEN, handleError);
  return data.createPurchase;
}

export async function getAnalytics(filter: object): Promise<object> {
  const data = await GQLRequest(`
    query getAnalytics($filter: PrendusAnalyticsFilter) {
      allPrendusAnalyticses(orderBy: createdAt_ASC, filter: $filter) {
        verb
        course {
          id
        }
        assignment {
          id
        }
        question {
          id
        }
      }
    }
  `, {filter}, AUTH_TOKEN, handleError);
  return data.allPrendusAnalyticses;
}

function handleError(err: any) {
  console.error(err);
}

function flatten(arr: any[], el: any): any[] {
  return arr.concat(Array.isArray(el) ? el.reduce(flatten, []) : el);
}

