import {RootReducer} from '../../../../src/redux/reducers';

class PrendusRubricTableTest extends Polymer.Element {

  static get is() { return 'prendus-rubric-table-test' }

  constructor() {
    super();
    this.rootReducer = RootReducer;
  }

  prepareTests(test) {
    test('Returns true', [], () => {
      return true;
    });
  }
}

window.customElements.define(PrendusRubricTableTest.is, PrendusRubricTableTest);
