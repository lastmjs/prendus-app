import {RootReducer} from '../../../../src/redux/reducers';

class PrendusRubricDropdownsTest extends Polymer.Element {

  static get is() { return 'prendus-rubric-dropdowns-test' }

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

window.customElements.define(PrendusRubricDropdownsTest.is, PrendusRubricDropdownsTest);
