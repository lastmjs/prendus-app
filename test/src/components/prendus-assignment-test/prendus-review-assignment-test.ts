import {RootReducer} from '../../../../src/redux/reducers';

class PrendusReviewAssignmentTest extends Polymer.Element {

  static get is() { return 'prendus-review-assignment-test' }

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

window.customElements.define(PrendusReviewAssignmentTest.is, PrendusReviewAssignmentTest);
