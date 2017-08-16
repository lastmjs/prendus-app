class PrendusStackedBar extends Polymer.Element {
  static get is() { return 'prendus-stacked-bar' }

  static get properties() {
    return {
      data: Array,
      label: String
    }
  }

  _computeWidth(data: number[], num: number) {
    const total = data.reduce((sum, num) => sum + num, 0);
    if (!total) return '';
    return 'width: ' + (num / total * 100) + '%;';
  }

}

window.customElements.define(PrendusStackedBar.is, PrendusStackedBar)
