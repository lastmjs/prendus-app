import {
  SetComponentPropertyAction,
  User
} from '../../typings/index.d';
import {
  navigate,
  createUUID,
  fireLocalAction
} from '../../node_modules/prendus-shared/services/utilities-service';

const hasAssignment = assignmentId => course => course.assignments.some(assignment => assignment.id === assignmentId);

class PrendusUnauthorizedModal extends Polymer.Element {
  authorized: boolean;
  user: User;
  assignmentId: string;
  enrolled: boolean;
  payed: boolean;

  static get is() { return 'prendus-unauthorized-modal' }

  static get properties() {
    return {
      assignmentId: String,
      enrolled: {
        type: Boolean,
        computed: '_computeEnrolled(user, assignmentId)'
      },
      payed: {
        type: Boolean,
        computed: '_computePayed(user, assignmentId)'
      },
      authorized: {
        type: Boolean,
        computed: '_computeAuthorized(enrolled, payed)',
        observer: '_authorizedChanged'
      }
    }
  }

  constructor() {
    super();
    this.componentId = createUUID();
  }

  _computePayed(user: User, assignmentId: string): boolean {
    if (!assignmentId || !user) return undefined;
    return user.purchases.some(p => hasAssignment(assignmentId)(p.course));
  }

  _computeEnrolled(user: User, assignmentId: string): boolean {
    if (!assignmentId || !user) return undefined;
    return user.enrolledCourses.some(hasAssignment(assignmentId));
  }

  _computeAuthorized(enrolled: boolean, payed: boolean): boolean {
    return true;
    return enrolled && payed;
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
    this.user = state.user;
  }
}

window.customElements.define(PrendusUnauthorizedModal.is, PrendusUnauthorizedModal);
