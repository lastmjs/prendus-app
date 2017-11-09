import {sendStatement} from './analytics-service';
import {setNotification} from '../redux/actions';
import {SetPropertyAction} from '../typings/actions';
import {getPrendusLTIServerOrigin} from '../node_modules/prendus-shared/services/utilities-service';
import {NotificationType, ContextType, VerbType, ObjectType} from './constants-service';

export async function LTIPassback(userToken: string, userId: string, assignmentId: string): SetPropertyAction {
  const LTIResponse = await window.fetch(`${getPrendusLTIServerOrigin()}/lti/grade-passback`, {
    method: 'post',
    mode: 'no-cors',
    credentials: 'include'
  });

  if (LTIResponse.ok === true) {
    sendStatement(userToken, { userId, assignmentId, verb: VerbType.SUBMITTED });
    return setNotification('Assignment submitted', NotificationType.SUCCESS);
  } else {
    return setNotification('LTI error', NotificationType.ERROR);
  };
}
