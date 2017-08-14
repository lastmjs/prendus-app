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
  rubric: Object[] = [];
  conceptOption: string;
  progress: number = 0;
  userToken: string | null;
  user: User;

  static get is() { return 'prendus-essay-scaffold' }

  static properties() {
    return {
      assignment: Object,
      cycle: {
        type: Number,
        value: 1
      },
      valid: {
        type: Boolean,
        computed: '_valid(resource, conceptOption, questionText, rubric)'
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

  _validRubric(rubric: Object): boolean {
    const notEmpty = (val) => val.toString().trim().length > 0;
    const categories = rubric.map(category => category.name);
    const scales = flatten(categories.map(category => rubric[category].scales.map(scale => scale.name)));
    const descriptions = flatten(categories.map(category => rubric[category].scales.map(scale => scale.descriptions)));
    const points = flatten(categories.map(category => rubric[category].scales.map(scale => Number(scale.points))));
    return rubric != null
      && categories.filter(notEmpty).length === categories.length
      && scales.filter(notEmpty).length === scales.length
      && descriptions.filter(notEmpty).length === descriptions.length
      && points.filter(num => num != NaN && num > -1).length === points.length;
  }

  _valid(resource: string, conceptOption: string, questionText: string, rubric: string): boolean {
    return resource.trim().length > 0
      && conceptOption != null
      && this._conceptOptions(this.assignment).map(concept => concept.id).includes(conceptOption.value)
      && questionText.trim().length > 0
      && this._validRubric(rubric);
  }

  _showNext(step: number): boolean {
    console.log(this.$.ironPages.children);
    return step < this.$.ironPages.children.length - 1;
  }

  _handleSubmit(): void {
    const progress = this.progress + 1;
    this._fireLocalAction('progress', progress);
    if (progress < this.cycle)
      this.clear();
    else
      console.log('done!');
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

  clear(): void {
    this._fireLocalAction('resource', '');
    this._fireLocalAction('conceptOption', null);
    this._fireLocalAction('questionText', '');
    this._fireLocalAction('rubric', '');
    this._fireLocalAction('step', 0);
  }

  submit(): void {
    if (!this.valid) {
      console.log('invalid!'); //TODO: jump to step with errors?
      return;
    }
    const mutation = `mutation createQuestion($userId: ID!, $resource: String!, $conceptOption: ID!, $questionText: String!, $rubric: Json!) {
      createQuestion (
        authorId: $userId,
        resource: $resource,
        conceptId: $conceptOption,
        text: $questionText,
        gradingRubric: {
          categories: $rubric,
          authorId: $userId,
        }
      ) {
        id
      }
    }`;
    const variables = {
      userId: this.user.id,
      resource: this.resource,
      conceptOption: this.conceptOption.value,
      questionText: this.questionText,
      rubric: this.rubric
    };
    GQLrequest(mutation, variables, this.userToken)
    .then(this._handleSubmit.bind(this))
    .catch(err => { console.error(err) });
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    const keys = Object.keys(componentState);
    if (keys.includes('loaded')) this.loaded = componentState.loaded;
    if (keys.includes('step')) this.step = componentState.step;
    if (keys.includes('resource')) this.resource = componentState.resource;
    if (keys.includes('questionText')) this.questionText = componentState.questionText;
    if (keys.includes('rubric')) this.rubric= componentState.rubric;
    if (keys.includes('progress')) this.progress = componentState.progress;
    this.userToken = state.userToken;
    this.user = state.user;
  }

}

function flatten(arr: any[]): any[] {
  return arr.reduce((acc, elem) => {
    return acc.concat(Array.isArray(elem) ? flatten(elem) : elem);
  },[]);
}

window.customElements.define(PrendusEssayScaffold.is, PrendusEssayScaffold)
