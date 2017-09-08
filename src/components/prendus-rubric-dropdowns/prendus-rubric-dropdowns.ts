import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {createUUID} from '../../node_modules/prendus-shared/services/utilities-service';

class PrendusRubricDropdowns extends Polymer.Element {
  loaded: boolean;
  action: SetPropertyAction | SetComponentPropertyAction;
  scores: {[key: string]: number};
  componentId: string;
  userToken: string | null;
  user: User;

  static get is() { return 'prendus-rubric-dropdowns' }

  static get properties() {
    return {
      rubric: {
        type: Object,
        observer: '_initScores'
      }
    }
  }

  constructor() {
    super();
    this.componentId = createUUID();
  }

  _fireLocalAction(key: string, value: any) {
    this.action = {
      type: 'SET_COMPONENT_PROPERTY',
      componentId: this.componentId,
      key,
      value
    };
  }

  reset() {
    const scores = Object.keys(this.rubric || {}).reduce((result, category) => {
      return {...result, [category]: -1 }
    }, {});
    this._fireLocalAction('scores', scores);
    this._notify(scores);
  }

  _initScores(rubric: Rubric) {
    this.reset();
  }

  _categories(rubric: Rubric): string[] {
    return Object.keys(rubric || {});
  }

  _options(rubric: Rubric, category: string): string[] {
    if (!rubric) return [];
    return Object.keys(rubric[category] || {});
  }

  _description(rubric: Rubric, category: string, option: string): string {
    if (!rubric || !rubric[category] || !rubric[category][option]) return '';
    return rubric[category][option].description || '';
  }

  _scoreCategory(e) {
    const { category, option } = e.model;
    const { points } = this.rubric[category][option];
    const newScores = {...this.scores, [category]: points };
    this._fireLocalAction('scores', newScores);
    this._notify(newScores);
  }

  _notify(scores: object) {
    const formatted = Object.keys(scores).map(category => {
      return {category, score: Number(scores[category]}
    }));
    const evt = new CustomEvent('scores-changed', {composed: true, detail: {scores: formatted}});
    this.dispatchEvent(evt);
  }

  connectedCallback() {
    super.connectedCallback();
    this._fireLocalAction('loaded', true);
  }

  categoryId(category: string, option: string): string {
    return category.replace(/\s/g, '-') + option.replace(/\s/g, '-');
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    const keys = Object.keys(componentState);
    if (keys.includes('loaded')) this.loaded = componentState.loaded;
    if (keys.includes('scores')) this.scores = componentState.scores;
    this.userToken = state.userToken;
    this.user = state.user;
  }

}

window.customElements.define(PrendusRubricDropdowns.is, PrendusRubricDropdowns)
