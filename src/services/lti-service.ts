import {sendStatement} from './analytics-service';
import {VerbType} from './constants-service';
import {GQLRequest} from '../node_modules/prendus-shared/services/graphql-service';

export async function LTIPassback(userToken: string, userId: string, assignmentId: string, courseId: string, ltiSessionIdJWT: string) {
  const data = await GQLRequest(`
    mutation($ltiSessionIdJWT: String!) {
      assignmentLTIGrade(ltiSessionIdJWT: $ltiSessionIdJWT) {
        success
      }
    }
  `, {ltiSessionIdJWT}, userToken, (error: any) => {
    throw error
  });

  if (data.assignmentLTIGrade.success === true)
    sendStatement(userToken, { userId, assignmentId, courseId, verb: VerbType.SUBMITTED });
}
