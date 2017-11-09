import {
  SetComponentPropertyAction,
  User,
  Course
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
  authorized: boolean;
  _user: User;
  user: User;
  assignmentId: string;
  course: Course;
  enrolled: boolean;
  payed: boolean;

  static get is() { return 'prendus-unauthorized-modal' }

  static get properties() {
    return {
      assignmentId: String,
      enrolled: {
        type: Boolean,
        computed: '_computeEnrolled(user, course)'
      },
      payed: {
        type: Boolean,
        computed: '_computePayed(user, course)'
      },
      authenticated: {
        type: Boolean,
        computed: '_computeAuthenticated(_user)'
      },
      opened: {
        type: Boolean,
        value: false,
        observer: '_openedChanged'
      }
    }
  }

  static get observers() {
    return [
      '_computeUser(_user, assignmentId, userToken)',
      '_computeView(authenticated, payed, enrolled)'
    ]
  }

  constructor() {
    super();
    this.componentId = createUUID();
  }

  async _computeUser(_user: User, assignmentId: string, userToken: string) {
    if (!_user || !assignmentId || !userToken)
      return undefined;
    const data = await getAuthorizationData(_user.id, assignmentId, userToken);
    this.action = fireLocalAction(this.componentId, 'user', data.user);
    this.action = fireLocalAction(this.componentId, 'course', data.assignment.course);
  }

  _computeAuthenticated(_user: User): boolean {
    if (_user === undefined)
      return undefined;
    else if (_user === null)
      return false;
    return true;
  }

  _computePayed(user: User, course: Course): boolean {
    if (!course || !user)
      return undefined;
    return user.purchases.some(p => p.course.id === course.id);
  }

  _computeEnrolled(user: User, course: Course): boolean {
    if (!course || !user)
      return undefined;
    return user.enrolledCourses.some(c => c.id === course.id);
  }

  _computeView(authenticated: boolean, payed: boolean, enrolled: boolean) {
    if (authenticated && payed && enrolled) {
      this.dispatchEvent(new CustomEvent('authorized'));
      this.shadowRoot.querySelector('#modal').close();
      return;
    }
    if (authenticated === undefined || payed === undefined || enrolled === undefined)
      return;
    const courseId = this.course.id;
    this.dispatchEvent(new CustomEvent('unauthorized', detail: { authenticated, payed, enrolled, courseId }));
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
    this.user = componentState.user; //local user with authorization data
    this.course = componentState.course;
    this._user = state.user; //redux user
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
