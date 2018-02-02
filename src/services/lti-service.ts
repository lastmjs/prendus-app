import {GQLRequest} from '../node_modules/prendus-shared/services/graphql-service';

export async function LTIPassback(userToken: string, ltiSessionIdJWT: string) {
  const data = await GQLRequest(`
    mutation($ltiSessionIdJWT: String!) {
      assignmentLTIGrade(ltiSessionIdJWT: $ltiSessionIdJWT) {
        success
      }
    }
  `, {ltiSessionIdJWT}, userToken, (error: any) => {
    throw error
  });
}
