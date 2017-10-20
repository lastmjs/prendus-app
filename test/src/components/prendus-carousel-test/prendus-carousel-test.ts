import {RootReducer} from '../../../../src/redux/reducers';
import {getListener} from '../../services/utilites-service';
import {PrendusCarousel} from '../../../../src/components/prendus-carousel/prendus-carousel';

const jsc = require('jsverify');

const NEXT = 'next';
const PREV = 'prev';
const COMMANDS = [NEXT, PREV];

const randomIndex = l => (l - 1) * Math.random();
const randomCommand = () => COMMANDS[randomIndex(COMMANDS.length)];

const executeCommand = (carousel, arr, i) => {
  switch (randomCommand()) {
    case NEXT:
      carousel.nextData();
      return i + 1 === arr.length ? null : arr[i + 1];
    case PREV:
      carousel.previousData();
      return i === 0 ? null : arr[i - 1];
    default:
      return undefined;
  }
}

class PrendusCarouselTest extends Polymer.Element {

  static get is() { return 'prendus-carousel-test' }

  constructor() {
    this.rootReducer = RootReducer;
  }

  prepareTests(test) {
    test('Carousel takes any array and produces null at the end', [jsc.array(jsc.json)], async (data: any[]) => {
      return true;
    });
  }
}

window.customElements.define(PrendusCarouselTest.is, PrendusCarouselTest);

