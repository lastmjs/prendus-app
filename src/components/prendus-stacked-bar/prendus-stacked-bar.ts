class PrendusStackedBar extends Polymer.Element {
  total: number;
  static get is() { return 'prendus-stacked-bar' }

  static get properties() {
    return {
      data: {
        type: Array,
        observer: "_dataChanged"
      }
      label: String
    }
  }

  _dataChanged(data: number[]) {
    this.total = data.reduce((sum, num) => sum + num, 0);
  }

  _computeWidth(num: number) {
    if (!this.total) return '';
    return 'width: ' + (num / this.total * 100) + '%;';
  }

}

window.customElements.define(PrendusStackedBar.is, PrendusStackedBar)
