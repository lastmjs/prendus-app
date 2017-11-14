import {SetPropertyAction, SetComponentPropertyAction, DefaultAction} from '../../typings/actions';
import {User} from '../../typings/user';
import {Question} from '../../typings/question';
import {GQLVariables} from '../../typings/gql-variables';
import {createUUID, navigate, fireLocalAction} from '../../node_modules/prendus-shared/services/utilities-service';
import {shuffleArray} from '../../services/utilities-service';
import {QuestionType, NotificationType, ContextType, VerbType, ObjectType} from '../../services/constants-service';
import {setNotification, getAndSetUser, checkForUserToken} from '../../redux/actions';
import {LTIPassback} from '../../services/lti-service';
import {sendStatement} from '../../services/analytics-service';
import {GQLRequest} from '../../node_modules/prendus-shared/services/graphql-service';

class PrendusQuestionContainer extends Polymer.Element {
  loaded: boolean;
  action: SetPropertyAction | SetComponentPropertyAction | DefaultAction;
  componentId: string;
  userToken: string;
  user: User;
  assignment: Assignment;
  flagQuestionModalOpened: boolean;
  noUserQuestions: boolean;
  questionIds: string[];
  questions:  Question[];
  static get is() { return 'prendus-question-container' }

  static get properties() {
    return {
        questionId: {
            type: String,
        },
    };
  }

  constructor() {
    super();
    this.componentId = createUUID();
  }

  async connectedCallback() {
    super.connectedCallback();
    this.action = fireLocalAction(this.componentId, 'loaded', false)
    this.action = fireLocalAction(this.componentId, 'loaded', true)
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    const keys = Object.keys(componentState);
    if (keys.includes('loaded')) this.loaded = componentState.loaded;
    if (keys.includes('assignment')) this.assignment = componentState.assignment;
    if (keys.includes('questions')) this.questions = componentState.questions;
    if (keys.includes('questionIds')) this.questionIds = componentState.questionIds;
    if (keys.includes('noUserQuestions')) this.noUserQuestions = componentState.noUserQuestions;
    if (keys.includes('error')) this.error = componentState.error;
    if (keys.includes('flagQuestionModalOpened')) this.flagQuestionModalOpened = componentState.flagQuestionModalOpened;
    this.userToken = state.userToken;
    this.user = state.user;
  }

}

window.customElements.define(PrendusQuestionContainer.is, PrendusQuestionContainer)
