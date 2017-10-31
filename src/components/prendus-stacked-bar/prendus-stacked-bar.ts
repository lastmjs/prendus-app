import {createUUID, fireLocalAction} from '../../node_modules/prendus-shared/services/utilities-service';

class PrendusStackedBar extends Polymer.Element {
  static get is() { return 'prendus-stacked-bar' }

  static get properties() {
    return {
      scores: {
        type: Array,
        observer: '_scoresChanged'
      },
      label: String
    }
  }

  constructor() {
    super();
    this.componentId = createUUID();
  }

  _scoresChanged(scores: CategoryScore[]) {
    this.action = fireLocalAction(this.componentId, 'data', barChartData(scores));
  }

  _computeWidth(data: number[], num: number) {
    const total = data.reduce((sum, num) => sum + num, 0);
    if (!total) return '';
    return 'width: ' + (num / total * 100) + '%;';
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    this.data = componentState.data;
  }
}

function barChartData(scores: CategoryScore[]): number[] {
  return scores
    ? scores.map(categoryScore => categoryScore.score).reduce((result, score) => {
      const tailLen = score - result.length + 1;
      const tail = tailLen > -1 ? Array(tailLen).fill(0) : [];
      const updated = [...result, ...tail];
      return [...updated.slice(0, score), updated[score]+1, ...updated.slice(score+1)];
    }, [])
    : [];
}

window.customElements.define(PrendusStackedBar.is, PrendusStackedBar)
