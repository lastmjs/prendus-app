import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {User} from '../../typings/user';
import {Assignment} from '../../typings/assignment';
import {AnswerTypes} from '../../typings/answer-types';
import {createUUID} from '../../services/utilities-service';
import {GQLrequest} from '../../services/graphql-service';
import {generateEssay} from '../../services/question-to-code-service';

class PrendusEssayScaffold extends Polymer.Element {
  loaded: boolean;
  action: SetPropertyAction | SetComponentPropertyAction;
  componentId: string;
  step: number = 0;
  assignment: Assignment;
  resource: string;
  questionText: string;
  rubric: Object[] = [];
  conceptId: string;
  progress: number = 0;
  userToken: string | null;
  user: User;

  static get is() { return 'prendus-essay-scaffold' }

  static properties() {
    return {
      assignment: Object,
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
      return { id: concept.id, label: concept.title };
    }
  }

  _valid(): boolean {
    console.log(this.__data);
    const notEmpty = (val) => val != undefined && val.toString().trim().length > 0;
    const categories = this.rubric.map(category => category.name);
    const options = flatten(this.rubric.map(category => category.options.map(scale => scale.name)));
    const descriptions = flatten(this.rubric.map(category => category.options.map(scale => scale.description)));
    const points = flatten(this.rubric.map(category => category.options.map(scale => Number(scale.points))));
    return notEmpty(this.resource)
      && this._conceptOptions(this.assignment).map(concept => concept.id).includes(this.conceptId)
      && notEmpty(this.questionText)
      && this.rubric != null
      && this.rubric.length > 0
      && this.rubric.filter(category => category.options.length > 1).length === this.rubric.length
      && categories.filter(notEmpty).length === categories.length
      && options.filter(notEmpty).length === options.length
      && descriptions.filter(notEmpty).length === descriptions.length
      && points.filter(num => num != NaN && num > -1).length === points.length;
  }

  _convertPointsToInts(rubric: Object[]): Object[] {
    return rubric.map(category => {
      const options = category.options.map(option => {
        return Object.assign(option, { points: Number(option.points) });
      });
      return Object.assign(category, { options });
    });
  }

  _showNext(step: number): boolean {
    return step < this.$.ironPages.children.length - 2; //because the last page is the 'done' page
  }

  _showSubmit(step: number): boolean {
    return !this._showNext(step) && step < this.$.ironPages.children.length - 1;
  }

  _showBack(step: number): boolean {
    return step > 0 && step < this.$.ironPages.children.length - 1;
  }

  _handleSubmit(data: Object): void {
    if (data.errors) throw new Error(data.errors.map(err => err.message).join("\n"));
    const progress = this.progress + 1;
    this._fireLocalAction('progress', progress);
    if (progress < 1)//this.assignment.createQuota)
      this.clear();
    else
      this._fireLocalAction('step', this.$.ironPages.children.length - 1);
  }

  exampleRubric(): Object[] {
    return [
      {
        name: 'Language',
        options: [
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
    this._fireLocalAction('conceptId', '');
    this._fireLocalAction('questionText', '');
    this._fireLocalAction('rubric', []);
    this._fireLocalAction('step', 0);
  }

  submit(): void {
    if (!this._valid()) {
      console.log('invalid!'); //TODO: jump to step with errors?
      return;
    }
    const mutation = `mutation createQuestion($userId: ID!, $assignmentId: ID, $resource: String!, $conceptId: ID!, $text: String!, $code: String!, $rubric: [RubriccategoriesRubricCategory!]!) {
      createQuestion (
        authorId: $userId,
        assignmentId: $assignmentId,
        resource: $resource,
        conceptId: $conceptId,
        text: $text,
        code: $code,
        gradingRubric: {
          categories: $rubric,
          authorId: $userId,
        }
      ) {
        id
      }
    }`;
    const { text, code } = generateEssay({ stem: this.questionText });
    const rubric = this._convertPointsToInts(this.rubric);
    const variables = {
      userId: this.user.id,
      assignmentId: this.assignment.id,
      resource: this.resource,
      conceptId: this.conceptId,
      text,
      code,
      rubric: this.rubric
    };
    console.log(variables);
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
