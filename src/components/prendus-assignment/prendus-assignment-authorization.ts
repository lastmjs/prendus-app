import {
  SetComponentPropertyAction,
  User,
  Course,
  AuthResult
} from '../../prendus.d';
import {
  createUUID,
  fireLocalAction,
} from '../../node_modules/prendus-shared/services/utilities-service';
import {
  GQLRequest
} from '../../node_modules/prendus-shared/services/graphql-service';
import {
  setNotification,
  getAndSetUser
} from '../../redux/actions';
import {
  NotificationType
} from '../../services/constants-service';

/**
 * This is a temporary solution to querying an assignment after authorizing the user.
 * The ideal solution is to define a resolver in graphcool that will run do the auth checks
 * and return the assignment if the user is authorized or the reason for failure otherwise.
 * We are temporarily using this solution because graphcool does not currently support relations
 * in the payload of custom resolvers. When they do support this option we can define a resolver with
 * a payload like
 * type AuthorizedAssignmentPayload {
 *   enrolled: Bool,
 *   payed: Bool,
 *   authenticated: Bool,
 *   assignment: Assignment // not currently supported
 * }
 */
class PrendusAssignmentAuthorization extends Polymer.Element {
  action: SetComponentPropertyAction;
  user: User;
  userToken: string;
  assignmentId: string;
  result: AuthResult;

  static get is() { return 'prendus-assignment-authorization' }

  static get properties() {
    return {
      assignmentId: String,
      userId: String,
      userToken: String
    }
  }

  static get observers() {
    return [
      '_computeAuthResult(assignmentId, userId, userToken)',
      '_processResult(result)'
    ]
  }

  constructor() {
    super();
    this.componentId = createUUID();
  }

  async _computeAuthResult(assignmentId: string, userId: string, userToken: string) {
      this.action = await getAndSetUser();
    if (this.userToken === null)
      this.action = fireLocalAction(this.componentId, 'result', {
        authenticated: false,
      });
    else if (!userToken || !assignmentId || !userId)
      return;
    else {
      const data = await getAuthorizationData(userId, assignmentId, userToken);
      if (!data || !data.user || !data.assignment || !data.assignment.course)
        this.action = setNotification('Authorization error', NotificationType.ERROR);
      else {
        const courseId = data.assignment.course.id;
        const instructor = data.user.ownedCourses.some(c => c.id === courseId);
        const payed = data.user.purchases.some(p => p.course.id === data.assignment.course.id);
        const enrolled = data.user.enrolledCourses.some(c => c.id === data.assignment.course.id);
        this.action = fireLocalAction(this.componentId, 'result', {
          authenticated: true,
          payed,
          enrolled,
          instructor,
          courseId
        });
      }
    }
  }

  _processResult(result: AuthResult) {
    const { authenticated, instructor, payed, enrolled } = result;
    if (authenticated && (instructor || (payed && enrolled)))
      this.dispatchEvent(new CustomEvent('authorized', { detail: {result} }));
    else
      this.dispatchEvent(new CustomEvent('unauthorized', { detail: {result} }));
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    this.result = componentState.result;
  }
}

function getAuthorizationData(userId: string, assignmentId: string, userToken: string): object {
  return GQLRequest(`
    query authorizationData($userId: ID!, $assignmentId: ID!) {
      assignment: Assignment(id: $assignmentId) {
        course {
          id
        }
      }
      user: User(id: $userId) {
        enrolledCourses {
          id
        }
        ownedCourses {
          id
        }
        purchases {
          course {
            id
          }
        }
      }
    }
  `, { userId, assignmentId }, userToken, () => {});
}

window.customElements.define(PrendusAssignmentAuthorization.is, PrendusAssignmentAuthorization);
