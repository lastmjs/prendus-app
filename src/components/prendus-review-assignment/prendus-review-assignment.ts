import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {User} from '../../typings/user';
import {createUUID} from '../../services/utilities-service';
import {GQLrequest} from '../../services/graphql-service';
import {shuffleArray} from '../../services/utilities-service';

class PrendusReviewAssignment extends Polymer.Element {
  loaded: boolean;
  action: SetPropertyAction | SetComponentPropertyAction;
  componentId: string;
  userToken: string | null;
  user: User;

  static get is() { return 'prendus-review-assignment' }

  static get properties() {
    return {
      assignmentId: {
        type: String,
        observer: '_assignmentIdChanged'
      }
    }
  }

  constructor() {
    super();
    this.componentId = createUUID();
  }

  connectedCallback() {
    super.connectedCallback();
    this._fireLocalAction('loaded', true);
  }

  _fireLocalAction(key: string, value: any) {
    this.action = {
      type: 'SET_COMPONENT_PROPERTY',
      componentId: this.componentId,
      key,
      value
    };
  }

  _assignmentIdChanged(id: string): void {
    this.loadAssignment(id);
  }

  async loadAssignment(assignmentId: string): Assignment {
    const data = await GQLrequest(`query getAssignment($assignmentId: ID!) {
      Assignment(id: $assignmentId) {
        id
        title
        questionType
        evaluationRubric {
          categories {
            name
            options {
              name
              description
              points
            }
          }
        }
        questions {
          id
          text
          code
          gradingRubric {
            categories {
              name
              options {
                name
                description
                points
              }
            }
          }
        }
      }
    }`, {assignmentId}, this.userToken);
    this._fireLocalAction('assignment', data.Assignment);
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    const keys = Object.keys(componentState);
    if (keys.includes('loaded')) this.loaded = componentState.loaded;
    if (keys.includes('assignment')) this.assignment = componentState.assignment;
    this.userToken = state.userToken;
    this.user = state.user;
  }

}

window.customElements.define(PrendusReviewAssignment.is, PrendusReviewAssignment)
