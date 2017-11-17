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

class PrendusQuestionViewerWrapper extends Polymer.Element {
  loaded: boolean;
  action: SetPropertyAction | SetComponentPropertyAction | DefaultAction;
  componentId: string;
  userToken: string;
  user: User;
  assignment: Assignment;
  flagQuestionModalOpened: boolean;
  noUserQuestions: boolean;
  questionIds: string[];
  question:  Question;
  questions:  Question[];
  add: boolean;
  delete: boolean;
  edit: boolean;

  static get is() { return 'prendus-question-viewer-wrapper' }

  static get properties() {
    return {
        question: {
            type: Question,
        },
        add: {
          type: Boolean,
          observer: 'stateValue'
        },
        edit: {
          type: Boolean,
        },
        delete: {
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
    this.action = fireLocalAction(this.componentId, 'loaded', true);
  }
  stateValue(){
    console.log('this.add', this.add)
  }
  setProperty(property: string){
    console.log('prop', property)
  }
  fireAddQuestion(e){
    console.log('e', e.target.id)
    const questionId = e.target.id;
    console.log('quesitonId', questionId)
    this.dispatchEvent(new CustomEvent('added', {
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

    if (keys.includes('assignment')) this.assignment = componentState.assignment;
    if (keys.includes('question')) this.question = componentState.question;
    if (keys.includes('questions')) this.questions = componentState.questions;
    if (keys.includes('questionIds')) this.questionIds = componentState.questionIds;
    if (keys.includes('noUserQuestions')) this.noUserQuestions = componentState.noUserQuestions;
    if (keys.includes('error')) this.error = componentState.error;
    if (keys.includes('flagQuestionModalOpened')) this.flagQuestionModalOpened = componentState.flagQuestionModalOpened;
    this.userToken = state.userToken;
    this.user = state.user;
  }

}

window.customElements.define(PrendusQuestionViewerWrapper.is, PrendusQuestionViewerWrapper)
