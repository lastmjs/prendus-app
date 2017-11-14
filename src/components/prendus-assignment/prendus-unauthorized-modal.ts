import {
  SetComponentPropertyAction,
  User,
  Course,
  AuthResult
} from '../../typings/index.d';
import {
  createUUID,
  fireLocalAction,
  navigate
} from '../../node_modules/prendus-shared/services/utilities-service';
import {
  GQLRequest
} from '../../node_modules/prendus-shared/services/graphql-service';

class PrendusUnauthorizedModal extends Polymer.Element {
  action: SetComponentPropertyAction;
  user: User;
  userToken: string;
  assignmentId: string;
  result: AuthResult;

  static get is() { return 'prendus-unauthorized-modal' }

  static get properties() {
    return {
      assignmentId: String,
      opened: {
        type: Boolean,
        value: false,
        observer: '_openedChanged'
      }
    }
  }

  static get observers() {
    return [
      '_computeAuthResult(assignmentId, user, userToken)',
      '_computeView(result)'
    ]
  }

  constructor() {
    super();
    this.componentId = createUUID();
  }

  async _computeAuthResult(assignmentId: string, _user: User, userToken: string) {
    if (_user === null && assignmentId)
      this.action = fireLocalAction(this.componentId, 'result', {
        authenticated: false,
      });
    if (!_user || !assignmentId || !userToken)
      return;
    const data = await getAuthorizationData(_user.id, assignmentId, userToken);
    const { user, assignment: { course } } = data;
    this.action = fireLocalAction(this.componentId, 'result', {
      authenticated: true,
      payed: user.purchases.some(p => p.course.id === course.id),
      enrolled: user.enrolledCourses.some(c => c.id === course.id)
    });
  }

  _computeView(result: AuthResult) {
    console.log(result);
    const { authenticated, payed, enrolled } = result;
    if (authenticated && payed && enrolled) {
      this.dispatchEvent(new CustomEvent('authorized'));
      this.shadowRoot.querySelector('#modal').close();
      return;
    }
    this.dispatchEvent(new CustomEvent('unauthorized', { detail: {...result} }));
  }

  _openedChanged(opened: boolean) {
    if (opened)
      this.shadowRoot.querySelector('#modal').open();
    else
      this.shadowRoot.querySelector('#modal').close();
  }

  _toHome(e: Event) {
    this.shadowRoot.querySelector('#modal').close();
    navigate('/');
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    this.result = componentState.result;
    this.user = state.user;
    this.userToken = state.userToken;
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

window.customElements.define(PrendusUnauthorizedModal.is, PrendusUnauthorizedModal);
