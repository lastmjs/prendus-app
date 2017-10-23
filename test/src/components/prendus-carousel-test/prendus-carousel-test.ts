import {
  createUUID,
  fireLocalAction,
  asyncMap
} from '../../../../src/node_modules/prendus-shared/services/utilities-service';
import {RootReducer} from '../../../../src/redux/reducers';
import {PrendusCarousel} from '../../../../src/components/prendus-carousel/prendus-carousel';
import {getListener} from '../../services/utilities-service';

const jsc = require('jsverify');
const dataArb = jsc.array(jsc.nat);

const NEXT = 'next';
const PREV = 'prev';
const COMMANDS = [NEXT, PREV];

const DATA_CHANGE = 'current-changed';
const FINISHED = 'finished-changed';

class PrendusCarouselTest extends Polymer.Element {

  static get is() { return 'prendus-carousel-test' }

  constructor() {
    super();
    this.componentId = createUUID();
    this.rootReducer = RootReducer;
  }

  getCarousel() {
    const carousel = new PrendusCarousel();
    this.shadowRoot.appendChild(carousel);
    return carousel;
  }

  prepareTests(test) {

    test('Carousel takes array next and previous commands', [jsc.nonshrink(dataArb)], async (data: number[]) => {
      const carousel = this.getCarousel();
      this.carousel = carousel;
      const setup = getListener(DATA_CHANGE, carousel);
      carousel.data = data;
      await setup;
      const initial = { index: 0, data: data[0], finished: !data.length };
      if (!verifyCarousel(initial, carousel))
        return false;
      const iterations = await asyncMap(data, async _ => {
        const command = randomCommand();
        const expected = getExpected(carousel, command);
        const event = getEvent(carousel, command);
        executeCommand(carousel, command);
        await event;
        const success = verifyCarousel(expected, carousel);
        if (!success) console.log(expected.index, expected.data, carousel.currentIndex, carousel.current, data);
        return success;
      });
      return iterations.reduce((success, nextCase) => success && nextCase, true);
    });
  }

  stateChange(e: CustomEvent) {
    const { state } = e.detail;
    const componentState = state.components[this.componentId] || {};
    this.carousel = componentState.carousel;
  }
}

function verifyCarousel(expect, carousel): boolean {
  return carousel.currentIndex === expect.index
    && carousel.current === expect.data
    && carousel.finished === expect.finished;
}

function randomIndex(l: number): number {
  return Math.round((l - 1) * Math.random());
}

function randomCommand(): string {
  return COMMANDS[randomIndex(COMMANDS.length)];
}

function executeCommand(carousel, command) {
  switch (command) {
    case NEXT:
      carousel.next();
      break;
    case PREV:
      carousel.previous();
      break;
    default:
      break;
  }
}

function getEvent(carousel, command) {
  const index = carousel.currentIndex;
  const data = carousel.data;
  switch (command) {
    case NEXT:
      return index < data.length - 1
        ? getListener(DATA_CHANGE, carousel)
        : getListener(FINISHED, carousel);
    case PREV:
      return index
        ? getListener(DATA_CHANGE, carousel)
        : Promise.resolve();
    default:
      return Promise.resolve();
  }
}

function getExpected(carousel, command) {
  const index = carousel.currentIndex;
  const data = carousel.data;
  switch (command) {
    case NEXT:
      return index < data.length - 1
        ? { index: index + 1, data: data[index + 1], finished: false }
        : { index, data: data[index], finished: true };
      return ;
    case PREV:
      carousel.previous();
      return carousel.currentIndex
        ? { index: index - 1, data: data[index - 1], finished: false }
        : { index, data: data[index], finished: false };
    default:
      return {};
  }
}

window.customElements.define(PrendusCarouselTest.is, PrendusCarouselTest);

