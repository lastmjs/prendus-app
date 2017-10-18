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
  unauthorized: boolean;
  user: User;
  assignmentId: string;
  needsToPay: boolean;
  needsToEnroll: boolean;

  static get is() { return 'prendus-unauthorized-modal' }

  static get properties() {
    return {
      assignmentId: String,
      needsToPay: {
        type: Boolean,
        value: false,
        computed: '_computeNeedsToPay(user, assignmentId)'
      },
      needsToEnroll: {
        type: Boolean,
        value: false,
        computed: '_computeNeedsToEnroll(user, assignmentId)'
      },
      unauthorized: {
        type: Boolean,
        value: false,
        notify: true,
        computed: '_computeUnauthorized(needsToPay, needsToEnroll)',
        observer: '_unauthorizedChanged'
      }
    }
  }

  constructor() {
    super();
    this.componentId = createUUID();
  }

  _computeNeedsToPay(assignmentId: string, user: User) {
    if (!assignmentId || !user) return;
    return !user.purchases.some(p => hasAssignment(assignmentId)(p.course));
  }

  _computeNeedsToEnroll(assignmentId: string, user: User) {
    if (!assignmentId || !user) return;
    return !user.enrolledCourses.some(hasAssignment(assignmentId));
  }

  _computeUnauthorized(needsToPay: boolean, needsToEnroll: boolean) {
    return needsToPay || needsToEnroll;
  }

  _unauthorizedChanged(unauthorized) {
    if (unauthorized)
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
    this.unauthorized = componentState.unauthorized;
    this.needsToEnroll = componentState.needsToEnroll;
    this.needsToPay = componentState.needsToPay;
    this.user = state.user;
  }
}

window.customElements.define(PrendusUnauthorizedModal.is, PrendusUnauthorizedModal);
