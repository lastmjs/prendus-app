import {
  SetComponentPropertyAction,
  CategoryScore,
  Rubric
} from '../../typings/actions';
import {
  createUUID,
  fireLocalAction
} from '../../node_modules/prendus-shared/services/utilities-service';

class PrendusRubricDropdowns extends Polymer.Element {
  loaded: boolean;
  action: SetComponentPropertyAction;
  rubric: Rubric;
  scores: CategoryScore[];
  componentId: string;

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

  connectedCallback() {
    super.connectedCallback();
    this.action = fireLocalAction(this.componentId, 'loaded', true);
  }

  reset() {
    const rubric = this.rubric;
    this.action = fireLocalAction(this.componentId, 'rubric', null);
    setTimeout(() => {
      this.action = fireLocalAction(this.componentId, 'rubric', rubric);
    });
    const scores = Object.keys(rubric || {}).map(resetScores);
    this.action = fireLocalAction(this.componentId, 'scores', scores);
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
    const newScores = this.scores.map(scoreCategory(category, Number(points)));
    this.action = fireLocalAction(this.componentId, 'scores', newScores);
    this._notify(newScores);
  }

  _notify(scores: object) {
    const evt = new CustomEvent('scores-changed', {detail: {scores}});
    this.dispatchEvent(evt);
  }

  categoryId(category: string, option: string): string {
    return category.replace(/\s/g, '-') + option.replace(/\s/g, '-');
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    this.loaded = componentState.loaded;
    this.scores = componentState.scores;
    this.rubric = componentState.rubric;
  }

}

function scoreCategory(category: string, points: number): (categoryScore: CategoryScore) => CategoryScore {
  return (categoryScore) => categoryScore.category === category
    ? { category, score: points }
    : categoryScore;
}

function resetScores(category) {
  return {category, score: -1};
}

window.customElements.define(PrendusRubricDropdowns.is, PrendusRubricDropdowns)
