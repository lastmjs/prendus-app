import {createUUID} from '../../node_modules/prendus_shared/services/utilities-service';

class PrendusStackedBar extends Polymer.Element {
  data: number[];
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

  _fireLocalAction(key: string, value: any) {
    this.action = {
      type: 'SET_COMPONENT_PROPERTY',
      componentId: this.componentId,
      key,
      value
    }
  }

  _scoresChanged(scores: CategoryScore[]) {
    const data = scores.map(obj => obj.score).reduce((result, score) => {
      const tailLen = score - result.length + 1;
      const tail = tailLen > -1 ? Array(tailLen).fill(0) : [];
      const updated = [...result, ...tail];
      return [...updated.slice(0, score), updated[score]+1, ...updated.slice(score+1)];
    }, []);
    this._fireLocalAction('data', data);
  }

  _computeWidth(data: number[], num: number) {
    const total = data.reduce((sum, num) => sum + num, 0);
    if (!total) return '';
    return 'width: ' + (num / total * 100) + '%;';
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    const keys = Object.keys(componentState);
    if (keys.includes('data')) this.data = componentState.data;
  }
}

window.customElements.define(PrendusStackedBar.is, PrendusStackedBar)
