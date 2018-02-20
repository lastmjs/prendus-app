import {SetPropertyAction, SetComponentPropertyAction, DefaultAction} from '../../prendus.d';
import {User, Question, Assignment} from '../../prendus.d';
import {createUUID, navigate, fireLocalAction} from '../../node_modules/prendus-shared/services/utilities-service';
import {shuffleArray} from '../../services/utilities-service';
import {QuestionType, NotificationType, ContextType, VerbType, ObjectType} from '../../services/constants-service';
import {setNotification, getAndSetUser, checkForUserToken} from '../../redux/actions';
import {LTIPassback} from '../../services/lti-service';
import {sendStatement} from '../../services/analytics-service';
import {GQLRequest} from '../../node_modules/prendus-shared/services/graphql-service';

class PrendusQuestionViewerWrapper extends Polymer.Element {
  loaded: boolean;
  action: SetPropertyAction | SetComponentPropertyAction | DefaultAction;
  componentId: string;
  userToken: string;
  user: User;
  assignment: Assignment;
  flagQuestionModalOpened: boolean;
  noUserQuestions: boolean;
  questionId: string;
  question:  Question;
  add: boolean;
  delete: boolean;
  edit: boolean;
  noActions: boolean;

  static get is() { return 'prendus-question-viewer-wrapper' }

  static get properties() {
    return {
        question: {
            type: Question,
            observer: 'questionLoaded',
        },
        add: {
          type: Boolean,
        },
        edit: {
          type: Boolean,
        },
        delete: {
          type: Boolean,
        },
        noActions: {
          type: Boolean,
        }
    };
  }

  constructor() {
    super();
    this.componentId = createUUID();
  }

  async connectedCallback() {
    super.connectedCallback();
    this.action = fireLocalAction(this.componentId, 'loaded', false);
    !this.add ? this.action = fireLocalAction(this.componentId, 'add', false) : this.add;
    !this.edit ? this.action = fireLocalAction(this.componentId, 'edit', false) : this.edit;
    !this.delete ? this.action = fireLocalAction(this.componentId, 'delete', false) : this.delete;
    !this.noActions ? this.action = fireLocalAction(this.componentId, 'noActions', false) : this.noActions;
    this.action = fireLocalAction(this.componentId, 'loaded', true);
  }
  questionLoaded(e){
    this.action = fireLocalAction(this.componentId, 'question', this.question);
  }
  fireAddQuestion(e){
    const questionId = e.target.dataset.questionid;
    this.dispatchEvent(new CustomEvent('added', {
        bubbles: false,
        detail: {
          questionId,
        }
    }));
  }
  fireRemoveQuestion(e){
    const questionId = e.target.dataset.questionid;
    this.dispatchEvent(new CustomEvent('deleted', {
        bubbles: false,
        detail: {
          questionId,
        }
    }));
  }
  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    const keys = Object.keys(componentState);
    if (keys.includes('loaded')) this.loaded = componentState.loaded;
    if (keys.includes('add')) this.add = componentState.add;
    if (keys.includes('edit')) this.edit = componentState.edit;
    if (keys.includes('delete')) this.delete = componentState.delete;
    if (keys.includes('noActions')) this.noActions = componentState.noActions;
    if (keys.includes('assignment')) this.assignment = componentState.assignment;
    if (keys.includes('question')) this.question = componentState.question;
    if (keys.includes('questionIds')) this.questionIds = componentState.questionIds;
    if (keys.includes('noUserQuestions')) this.noUserQuestions = componentState.noUserQuestions;
    if (keys.includes('error')) this.error = componentState.error;
    if (keys.includes('flagQuestionModalOpened')) this.flagQuestionModalOpened = componentState.flagQuestionModalOpened;
    this.userToken = state.userToken;
    this.user = state.user;
  }

}

window.customElements.define(PrendusQuestionViewerWrapper.is, PrendusQuestionViewerWrapper)
