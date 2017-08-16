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
  userToken: string | null;
  user: User;

  static get is() { return 'prendus-essay-scaffold' }

  static properties() {
    return {
      question: Object,
      concepts: Array
    }
  }

  constructor() {
    super();
    this.componentId = createUUID();
  }

  connectedCallback() {
    super.connectedCallback();
    this._fireLocalAction('loaded', true);
    this.addEventListener('question-rubric-table', (e) => {
      console.log(e.detail);
      const { rubric } = e.detail;
      this._fireLocalAction('question', Object.assign({}, this.question, {rubric}));
    });
  }

  _fireLocalAction(key: string, value: any) {
    this.action = {
      type: 'SET_COMPONENT_PROPERTY',
      componentId: this.componentId,
      key,
      value
    };
  }

  _conceptOptions(concepts: Object[]): {[key: string]: string} {
    return [];
    return concepts.map(concept => {
      return { id: concept.id, label: concept.title };
    }
  }

  _valid(): boolean {
    const notEmpty = (val) => val != undefined && val.toString().trim().length > 0;
    const categories = Object.keys(this.question.rubric);
    const options = flatten(categories.map(category => Object.keys(this.question.rubric[category])));
    const descriptions = flatten(categories.map(category => Object.keys(this.question.rubric[category]).map(option => this.question.rubric[category][option].description)));
    const points = flatten(categories.map(category => Object.keys(this.question.rubric[category]).map(option => this.question.rubric[category][option].points)));
    return notEmpty(this.question.resource)
      && this._conceptOptions(this.concepts).map(concept => concept.id).includes(this.question.conceptId)
      && notEmpty(this.question.text)
      && this.rubric != null
      && categories.length > 0
      && categories.filter(category => Object.keys(this.rubric[category]).length > 1).length === this.rubric.length
      && categories.filter(notEmpty).length === categories.length
      && options.filter(notEmpty).length === options.length
      && descriptions.filter(notEmpty).length === descriptions.length
      && points.filter(num => num != NaN && num > -1).length === points.length;
  }

  _showNext(step: number): boolean {
    return step < this.$.ironPages.children.length - 1;
  }

  _handleSubmit(data: Object): void {
    if (data.errors) throw new Error(data.errors.map(err => err.message).join("\n"));
    const evt = new Event('question-created', { bubbles: false });
    this.dispatchEvent(evt);
  }

  exampleRubric(): Object[] {
    return {
      Language: {
        Professional: {
          description: 'The language is of good academic quality in vocabulary and grammar',
          points: 2
        },
        Casual: {
          description: 'The answer has a more conversational tone',
          points: 1
        },
        Poor: {
          description: 'The answer contains grammar and spelling errors',
          points: 0
        }
      }
    }
  }

  back(): void {
    this._fireLocalAction('step', this.step - 1);
  }

  next(): void {
    this._fireLocalAction('step', this.step + 1);
  }

  submit(): void {
    if (!this._valid()) {
      console.log('invalid!'); //TODO: jump to step with errors?
      return;
    }
    const mutation = `mutation createQuestion($userId: ID!, $assignmentId: ID, $resource: String!, $conceptId: ID!, $text: String!, $code: String!) {
      createQuestion (
        authorId: $userId,
        assignmentId: $assignmentId,
        resource: $resource,
        conceptId: $conceptId,
        text: $text,
        code: $code,
      ) {
        id
      }
    }`;
    const { text, code } = generateEssay({
      stem: this.question.text,
      code: `const gradingRubric = '${JSON.stringify(rubric)}';`
    });
    const variables = {
      userId: this.user.id,
      assignmentId: this.assignment.id,
      resource: this.question.resource,
      conceptId: this.question.conceptId,
      text,
      code
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
    if (keys.includes('question')) this.question = componentState.question;
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
