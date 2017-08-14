import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {User} from '../../typings/user';
import {Assignment} from '../../typings/assignment';
import {createUUID} from '../../services/utilities-service';
import {GQLrequest} from '../../services/graphql-service';

class PrendusEssayScaffold extends Polymer.Element {
  loaded: boolean;
  action: SetPropertyAction | SetComponentPropertyAction;
  componentId: string;
  step: number = 0;
  assignment: Assignment;
  resource: string;
  questionText: string;
  rubricJson: string;
  conceptOption: string;
  userToken: string | null;
  user: User;

  static get is() { return 'prendus-essay-scaffold' }

  static properties() {
    return {
      assignment: Object,
      valid: {
        type: Boolean,
        computed: '_valid(resource, conceptOption, questionText, rubricJson)'
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

  _conceptOptions(assignment: Assignment): {[key: string]: string} {
    return assignment.concepts.map(concept => {
      return { value: concept.id, label: concept.title };
    }
  }

  _valid(resource: string, conceptOption: string, questionText: string, rubricJson: string): boolean {
    return false;
  }

  _showNext(step: number): boolean {
    console.log(this.$.ironPages.children);
    return step < this.$.ironPages.children.length - 1;
  }

  exampleRubric(): Object[] {
    return [
      {
        name: 'Language',
        scales: [
          {
            name: 'Professional',
            description: 'The language is of good academic quality in vocabulary and grammar',
            points: 2
          },
          {
            name: 'Casual',
            description: 'The answer has a more conversational tone',
            points: 1
          },
          {
            name: 'Poor',
            description: 'The answer contains grammar and spelling errors',
            points: 0,
          }
        ]
      }
    ]
  }

  back(): void {
    this._fireLocalAction('step', this.step - 1);
  }

  next(): void {
    this._fireLocalAction('step', this.step + 1);
  }

  submit(): void {
    if (!this.valid) {
      console.log('invalid!'); //TODO: jump to step with errors?
      return;
    }
    const mutation = `mutation createQuestion($userId: ID!, $resource: String!, $conceptOption: ID!, $questionText: String!, $rubricJson: Json!) {
      createQuestion (
        authorId: $userId,
        resource: $resource,
        conceptId: $conceptOption,
        text: $questionText,
        rubric: $rubricJson
      ) {
        id
      }
    }`;
    const variables = {
      userId: this.user.id,
      resource: this.resource,
      conceptOption: this.conceptOption.value,
      questionText: this.questionText,
      rubricJson: this.rubricJson
    };
    GQLrequest(mutation, variables, this.userToken);
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    const keys = Object.keys(componentState);
    if (keys.includes('loaded')) this.loaded = componentState.loaded;
    if (keys.includes('step')) this.step = componentState.step;
    this.userToken = state.userToken;
    this.user = state.user;
  }

}

window.customElements.define(PrendusEssayScaffold.is, PrendusEssayScaffold)
