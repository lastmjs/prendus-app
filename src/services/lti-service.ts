import {sendStatement} from './analytics-service';
import {setNotification} from '../redux/actions';
import {SetPropertyAction} from '../typings/actions';
import {NotificationType, ContextType, VerbType, ObjectType} from './constants-service';
import {GQLRequest} from '../node_modules/prendus-shared/services/graphql-service';

export async function LTIPassback(userToken: string, userId: string, assignmentId: string, ltiSessionIdJWT: string): SetPropertyAction {
    const data = await GQLRequest(`
        mutation($ltiSessionIdJWT: String!) {
          assignmentLTIGrade(ltiSessionIdJWT: $ltiSessionIdJWT) {
            success
          }
        }
    `, {ltiSessionIdJWT}, userToken, (error: any) => {
      throw error
    });

  if (data.assignmentLTIGrade.success === true) {
    sendStatement(userToken, { userId, assignmentId, VerbType.SUBMITTED });
    return setNotification('Assignment submitted', NotificationType.SUCCESS);
  } else {
    return setNotification('LTI error', NotificationType.ERROR);
  };
}
