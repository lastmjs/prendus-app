import {GQLrequest} from './graphql-service';
import {sendStatement} from './analytics-service';
import {setNotification} from '../redux/actions';
import {SetPropertyAction} from '../typings/actions';
import {getPrendusLTIServerOrigin} from './utilities-service';
import {NotificationType, ContextType} from './constants-service';

export async function LTIPassback(userId: string, assignmentId: string, assignmentType: string): SetPropertyAction {
  const LTIResponse = await window.fetch(`${getPrendusLTIServerOrigin()}/lti/grade-passback`, {
    method: 'post',
    mode: 'no-cors',
    credentials: 'include'
  });

  if (LTIResponse.ok === true) {
    sendStatement(userId, assignmentId, ContextType.ASSIGNMENT, "SUBMITTED", assignmentType);
    return setNotification('Assignment submitted', NotificationType.SUCCESS);
  } else {
    return setNotification('LTI error', NotificationType.ERROR);
  };
}
