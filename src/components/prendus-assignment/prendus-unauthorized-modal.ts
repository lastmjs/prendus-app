import {
  SetComponentPropertyAction,
  User,
  Course
} from '../../typings/index.d';
import {
  navigate,
  createUUID,
  fireLocalAction
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
        computed: '_computeAuthenticated(_user)',
        observer: '_authenticatedChanged'
      },
      authorized: {
        type: Boolean,
        computed: '_computeAuthorized(enrolled, payed)',
        observer: '_authorizedChanged'
      }
    }
  }

  static get observers() {
    return [
      '_computeUser(_user, assignmentId, userToken)'
    ]
  }

  constructor() {
    super();
    this.componentId = createUUID();
  }

  async _computeUser(_user: User, assignmentId: string, userToken: string): User {
    if (!_user || !assignmentId || !userToken) return;

    const data = await GQLRequest(`
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
    `, { userId: _user.id, assignmentId }, userToken, () => {});
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

  _computeAuthorized(enrolled: boolean, payed: boolean): boolean {
    return enrolled && payed;
  }

  _authenticatedChanged(authenticated: boolean) {
    if (!authenticated)
      navigate('/authenticate');
  }

  _authorizedChanged(authorized: boolean) {
    if (!authorized)
      this.shadowRoot.querySelector('#modal').open();
    else {
      this.dispatchEvent(new CustomEvent('authorized'));
      this.shadowRoot.querySelector('#modal').close();
    }
  }

  _toHome(e: Event) {
    this.shadowRoot.querySelector('#modal').close();
    navigate('/');
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    this.user = componentState.user;
    this.course = componentState.course;
    this._user = state.user;
    this.userToken = state.userToken;
  }
}

window.customElements.define(PrendusUnauthorizedModal.is, PrendusUnauthorizedModal);
