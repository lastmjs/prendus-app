import {
  SetComponentPropertyAction,
  User,
  Course,
  AuthResult
} from '../../../prendus.d';
import {
  createUUID,
  fireLocalAction,
} from '../../node_modules/prendus-shared/services/utilities-service';
import {
  GQLRequest
} from '../../node_modules/prendus-shared/services/graphql-service';
import {
  setNotification
} from '../../redux/actions';
import {
  NotificationType
} from '../../services/constants-service';

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
    if (userToken === null)
      this.action = fireLocalAction(this.componentId, 'result', {
        authenticated: false,
      });
    else if (!userToken || !assignmentId || !userId)
      return;
    else {
      const data = await getAuthorizationData(userId, assignmentId, userToken);
      if (!data || !data.user || !data.assignment || !data.assignment.course)
        this.action = setNotification('Authorization error', NotificationType.ERROR);
      else
        this.action = fireLocalAction(this.componentId, 'result', {
          authenticated: true,
          payed: data.user.purchases.some(p => p.course.id === data.assignment.course.id),
          enrolled: data.user.enrolledCourses.some(c => c.id === data.assignment.course.id)
          courseId: data.assignment.course.id
        });
    }
  }

  _processResult(result: AuthResult) {
    const { authenticated, payed, enrolled } = result;
    if (authenticated && payed && enrolled)
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
