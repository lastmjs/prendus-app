import {
  User,
  AssignmentFunctions,
  AuthResult
} from '../../prendus.d';
import {
  createUUID,
  fireLocalAction,
  getCookie
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

class PrendusAssignmentShared extends Polymer.Element {
  componentId: string;
  action: SetPropertyAction | SetComponentPropertyAction;
  user: User;
  userToken: string;
  loaded: boolean;
  unauthorized: boolean;
  authResult: AuthResult;
  assignmentId: string;
  functions: AssignmentFunctions;
  items: object[];
  finished: boolean;
  verb: string;
  label: string;
  message: string;
  success: boolean;

  static get is() { return 'prendus-assignment-shared' }

  static get properties() {
    return {
      assignmentId: String,
      functions: {
        type: Object,
        value: {
          loadItems: async assignmentId => ({
            items: [],
            error: 'Load function was not supplied'
          }),
          error: () => null,
          submitItem: async item => null
        }
      },
      verb: String,
      item: {
        type: Object,
        notify: true
      },
      label: {
        type: String,
        value: 'Question'
      },
      hideBack: {
        type: Boolean,
        value: false
      },
      hideNext: {
        type: Boolean,
        value: false
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
    const { title, items, taken, error } = await this.functions.loadItems(this.assignmentId);
    this.action = fireLocalAction(this.componentId, 'title', title);
    this.action = fireLocalAction(this.componentId, 'items', items);
    if (taken)
      this.action = setNotification(DONE_MESSAGE, NotificationType.WARNING);
    if (error)
      this.action = setNotification(error, NotificationType.ERROR);
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
    if (this.finished)
      return;
    this.action = fireLocalAction(this.componentId, 'loaded', false);
    const err = this.functions.error(this.item);
    if (err) {
      this.action = setNotification(err, NotificationType.ERROR);
      this.dispatchEvent(new CustomEvent(ASSIGNMENT_VALIDATION_ERROR));
      this.action = fireLocalAction(this.componentId, 'loaded', true);
      return;
    }
    const questionId = await this.functions.submitItem(this.item);
    await this._sendStatement(this.verb, questionId);
    this.dispatchEvent(new CustomEvent(STATEMENT_SENT));
    this.shadowRoot.querySelector('#carousel').next();
    this.action = fireLocalAction(this.componentId, 'loaded', true);
  }

  _previous() {
    if (!this.hideBack)
      this.shadowRoot.querySelector('#carousel').previous();
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
      console.log(error);
      this.action = setNotification(GRADE_FAILED, NotificationType.ERROR);
      this.action = fireLocalAction(this.componentId, 'success', false);
    }
  }

  async _finished(e: CustomEvent) {
    const finished = e.detail.value;
    this.action = fireLocalAction(this.componentId, 'finished', finished);
    if (finished && this.items && this.items.length) {
      this.action = fireLocalAction(this.componentId, 'loaded', false);
      await this._sendStatement(VerbType.SUBMITTED, null);
      this.dispatchEvent(new CustomEvent(ASSIGNMENT_SUBMITTED));
      await this._gradePassback();
      this.action = fireLocalAction(this.componentId, 'loaded', true);
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

window.customElements.define(PrendusAssignmentShared.is, PrendusAssignmentShared);
