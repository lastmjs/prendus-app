import {sendStatement} from './analytics-service';
import {setNotification} from '../redux/actions';
import {SetPropertyAction} from '../typings/actions';
import {getPrendusLTIServerOrigin} from '../node_modules/prendus-shared/services/utilities-service';
import {NotificationType, ContextType, VerbType, ObjectType} from './constants-service';
import {GQLRequest} from '../node_modules/prendus-shared/services/graphql-service';

export async function LTIPassback(userToken: string, userId: string, assignmentId: string, assignmentType: string, ltiSessionIdJWT: string): SetPropertyAction {
    const data = await GQLRequest(`
        mutation($ltiSessionIdJWT: String!) {
          assignmentLTIGrade(ltiSessionIdJWT: $ltiSessionIdJWT) {
            success
          }
        }
    `, {
        ltiSessionIdJWT
    }, userToken, (error: any) => {
        throw error;
    });

  if (data.assignmentLTIGrade.success === true) {
    sendStatement(userToken, userId, assignmentId, ContextType.ASSIGNMENT, VerbType.SUBMITTED, assignmentType);
  }
}
