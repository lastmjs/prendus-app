import {GQLRequest} from '../../../../src/node_modules/prendus-shared/services/graphql-service';
import {GQLVariables} from '../../../../src/typings/gql-variables';
import {GQLArbitrary} from './services/arbitraries-service';

const AUTH_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE1MDQxOTcxNzMsImNsaWVudElkIjoiY2o1bDg3cmQwMzVoaTAxMzQ0bzAwNW5maCIsInByb2plY3RJZCI6ImNqNW12aXNoaW5ucGYwMTM0OG04Z3p0YjAiLCJwZXJtYW5lbnRBdXRoVG9rZW5JZCI6ImNqNzBvNXJldTA0ZmEwMTk4a2ZlNnkwaXIifQ.LbuydRKQjQgbMiMggFU-wOr-IKSxzcO5ZA5mAZGEUjU';

const dependencyTree = [
  'Discipline',
  'Subject',
  'Concept',
  'Question',
  'CategoryScore',
  'QuestionRating',
  'Assignment',
  'Course'
];

function dependencySort(typeA, typeB) {
  return dependencyTree.indexOf(typeA) < dependencyTree.indexOf(typeB) ? 1 : -1;
}

export async function createTestUser(role: string): {id: string, token: string} {
  const email = `test-${role}@test-prendus.com`;
  const data = await GQLRequest(`mutation create($role: UserRole!, $email: String!) {
    createUser(role: $role, authProvider: { email: { email: $email, password: "test" } }) {
      id
      role
    }
    signinUser(email: { email: $email, password: "test" }) {
      token
    }
  }`, {role, email}, AUTH_TOKEN, handleError);
  return {
    id: data.createUser.id,
    role: data.createUser.role,
    token: data.signinUser.token
  }
}

export async function deleteTestUsers(...users: User[]) {
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

export async function saveArbitrary(arb: GQLArbitrary) {
  const query = arbToCreateQuery(arb);
  const variables = arbToVariables(arb);
  const data = await GQLRequest(query, variables, AUTH_TOKEN, handleError);
  return data;
}

export async function deleteArbitrary(arbData: object) {
  const ids = extractIds(arbData);
  const query = deleteQuery(ids);
  await GQLRequest(query, ids, AUTH_TOKEN, handleError);
}

function deleteQuery(ids: object): string {
  const params = Object.keys(ids).map((k, i) => `$${k}: ID!`).join(', ');
  const toType = str => str.replace(/\d+/g, '');
  return `
    mutation del(${params}) {
      ` + Object.keys(ids)
      .sort((a, b) => dependencySort(toType(a), toType(b)))
      .map((k, i) => {
        return `${k}: delete${toType(k)}(id: $${k}) {id}`;
      }).join("\n")
      + `
    }
  `;
}

function extractIdsRecursive(obj: object, T: string): object {
  return Object.keys(obj)
    .filter(k => k != 'id')
    .map(k => {
      return Array.isArray(obj[k])
        ? obj[k].map(el => extractIdsRecursive(el, k))
        : extractIdsRecursive(obj[k], k)
    }).concat({type: T, id: obj.id});
}

function extractIds(typedIds) {
  return Object.keys(typedIds)
    .map(T => extractIdsRecursive(typedIds[T], T))
    .reduce(flatten, [])
    .sort((a, b) => dependencySort(a.type, b.type))
    .reduce((vars, typedId, i) => {
      return {
        ...vars,
        [typedId.type + i]: typedId.id
      }
    }, {});
}

function arbToCreateQuery(arb: GQLArbitrary): string {
  const params = Object.keys(arb)
    .filter(k => k != 'type')
    .map(k => `$${k}:` + arbParamType(arb.type, k, arb[k]))
    .join(', ');
  return `
    mutation saveArb(${params}) {
      ${arb.type}: create${arb.type} (
        ` + Object.keys(arb).filter(k => k != 'type').map(k => `${k}: $${k}`).join("\n") + `
      ) {
        ${collectArbIds(arb)}
      }
    }
  `;
}

//TODO: need a good way to handle enums
function arbParamType(containerType: string, fieldName: string, field: any): string {
  if (Array.isArray(field))
    return `[${containerType + fieldName + field[0].type}!]`
  if (field && typeof field === 'object')
    return `${containerType + fieldName + field.type}!`;
  if (typeof field === 'string')
    return fieldName.match(/^\w+Id/) ? 'ID!' : 'String!';
  return 'Int!';
}

function collectArbIds(arb: GQLArbitrary): string {
  return `
    id
  ` + Object.keys(arb)
      .filter(k => k != 'type')
      .reduce((result, k) => {
        if (['string', 'number'].includes(typeof arb[k]))
          return result;
        if (Array.isArray(arb[k]))
          return result + `
            ${arb[k][0].type}: ${k} { ${collectArbIds(arb[k][0])}
          }`;
        return result + `
          ${arb[k].type}: ${k} { ${collectArbIds(arb[k])}
        }`;
      }, '');
}

function arbToVariables(arb: GQLArbitrary): GQLVariables {
  const vars = {...arb};
  if (vars.type) delete vars.type;
  Object.keys(arb).filter(k => k != 'type').forEach(k => {
    if (Array.isArray(arb[k]))
      vars[k] = arb[k].map(arbToVariables);
    else if (typeof arb[k] === 'object')
      vars[k] = arbToVariables(arb[k]);
  });
  return vars;
}

function handleError(err: any) {
  console.error(err);
}

function flatten(arr: any[], el: any): any[] {
  return arr.concat(Array.isArray(el) ? el.reduce(flatten, []) : el);
}

