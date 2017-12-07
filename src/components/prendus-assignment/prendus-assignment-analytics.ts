import {
  User,
  AnalyticsAssignment,
  AuthResult
} from '../../prendus.d';
import {
  createUUID,
  fireLocalAction,
} from '../../node_modules/prendus-shared/services/utilities-service';
import {
  sendStatement
} from '../../services/analytics-service';
import {
  setNotification
} from '../../redux/actions';
import {
  LTIPassback
} from '../../services/lti-service';
import {
  NotificationType,
  VerbType,
  ASSIGNMENT_SUBMITTED,
  ASSIGNMENT_LOADED,
  ASSIGNMENT_VALIDATION_ERROR,
  STATEMENT_SENT
} from '../../services/constants-service';

const TAKEN_MESSAGE = 'You have already completed this assignment';
const DONE_MESSAGE = 'You have completed this assignment';
const INSUFFICIENT_MESSAGE = 'There are not enough questions to take this assignment yet';
const GRADE_SUCCESS = 'Grade passback succeeded';
const GRADE_FAILED = 'Grade passback failed';

class PrendusAssignmentAnalytics extends Polymer.Element {
  componentId: string;
  action: SetPropertyAction | SetComponentPropertyAction;
  user: User;
  userToken: string;
  loaded: boolean;
  unauthorized: boolean;
  authResult: AuthResult;
  assignmentId: string;
  assignment: AnalyticsAssignment;
  items: object[];
  finished: boolean;
  verb: string;
  label: string;
  message: string;
  success: boolean;

  static get is() { return 'prendus-assignment-analytics' }

  static get properties() {
    return {
      assignmentId: String,
      assignment: {
        type: Object,
        value: {
          load: async assignmentId => ({
            items: [],
            error: 'Load function was not supplied'
          }),
          error: () => null,
          submit: async item => null
        }
      },
      verb: String,
      label: {
        type: String,
        value: 'Question'
      },
      item: {
        type: Object,
        notify: true
      }
    }
  }

  constructor() {
    super();
    this.componentId = createUUID();
  }

  connectedCallback() {
    super.connectedCallback();
    this.action = fireLocalAction(this.componentId, 'loaded', false);
    this.action = fireLocalAction(this.componentId, 'message', DONE_MESSAGE);
    this.action = fireLocalAction(this.componentId, 'success', true);
  }

  async _load(e: CustomEvent) {
    const { result } = e.detail;
    this.action = fireLocalAction(this.componentId, 'authResult', result);
    this.action = fireLocalAction(this.componentId, 'unauthorized', false);
    this.action = fireLocalAction(this.componentId, 'loaded', false);
    const { title, items, taken, error } = await this.assignment.loadItems(this.assignmentId, this.user.id, this.userToken);
    this.action = fireLocalAction(this.componentId, 'title', title);
    this.action = fireLocalAction(this.componentId, 'items', items);
    if (taken)
      this.action = setNotification(DONE_MESSAGE, NotificationType.WARNING);
    if (error)
      this.action = fireLocalAction(this.componentId, 'message', error);
    else if (!items.length)
      this.action = fireLocalAction(this.componentId, 'message', INSUFFICIENT_MESSAGE);
    else
      await this._sendStatement(VerbType.STARTED, null);
    this.dispatchEvent(new CustomEvent(ASSIGNMENT_LOADED));
    this.action = fireLocalAction(this.componentId, 'loaded', true);
  }

  _unauthorized(e: CustomEvent) {
    const { result } = e.detail;
    this.action = fireLocalAction(this.componentId, 'loaded', true);
    this.action = fireLocalAction(this.componentId, 'authResult', result);
    this.action = fireLocalAction(this.componentId, 'unauthorized', true);
  }

  async _next(e: CustomEvent) {
    this.action = fireLocalAction(this.componentId, 'loaded', false);
    const err = this.assignment.error();
    if (err) {
      this.action = setNotification(err, NotificationType.ERROR);
      this.dispatchEvent(new CustomEvent(ASSIGNMENT_VALIDATION_ERROR));
      return;
    }
    const questionId = await this.assignment.submitItem(this.item);
    await this._sendStatement(this.verb, questionId);
    this.dispatchEvent(new CustomEvent(STATEMENT_SENT));
    this.shadowRoot.querySelector('#carousel').next();
    this.action = fireLocalAction(this.componentId, 'loaded', true);
  }

  _item(e: CustomEvent) {
    this.action = fireLocalAction(this.componentId, 'item', e.detail.value);
  }

  async _gradePassback() {
    try {
      await LTIPassback(this.userToken, getCookie('ltiSessionIdJWT'));
      this.action = setNotification(GRADE_SUCCESS, NotificationType.SUCCESS);
    }
    catch(error) {
      this.action = setNotification(GRADE_FAILED, NotificationType.ERROR);
      this.action = fireLocalAction(this.componentId, 'success', false);
    }
  }

  async _finished(e: CustomEvent) {
    const finished = e.detail.value;
    this.action = fireLocalAction(this.componentId, 'finished', finished);
    if (finished && this.items && this.items.length) {
      await this._sendStatement(VerbType.SUBMITTED, null);
      this.dispatchEvent(new CustomEvent(ASSIGNMENT_SUBMITTED));
      await this._gradePassback();
    }
  }

  _sendStatement(verb: string, questionId: string | null) {
    return sendStatement(this.userToken, {
      userId: this.user.id,
      assignmentId: this.assignmentId,
      courseId: this.authResult.courseId,
      questionId,
      verb
    });
  }

  _message(finished: boolean, unauthorized: boolean): boolean {
    return finished && !unauthorized;
  }

  stateChange(e: CustomEvent) {
    const { state } = e.detail;
    const componentState = state.components[this.componentId] || {};
    this.loaded = componentState.loaded;
    this.authResult = componentState.authResult;
    this.unauthorized = componentState.unauthorized;
    this.title = componentState.title;
    this.items = componentState.items;
    this.item = componentState.item;
    this.message = componentState.message;
    this.success = componentState.success;
    this.finished = componentState.finished;
    this.user = state.user;
    this.userToken = state.userToken;
  }
}

window.customElements.define(PrendusAssignmentAnalytics.is, PrendusAssignmentAnalytics);
