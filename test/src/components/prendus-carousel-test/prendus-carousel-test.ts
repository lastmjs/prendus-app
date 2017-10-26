import {
  createUUID,
  asyncMap
} from '../../../../src/node_modules/prendus-shared/services/utilities-service';
import {RootReducer} from '../../../../src/redux/reducers';
import {PrendusCarousel} from '../../../../src/components/prendus-carousel/prendus-carousel';
import {getListener} from '../../services/utilities-service';

const jsc = require('jsverify');
const dataArb = jsc.array(jsc.nat);

const NEXT = 'next';
const PREV = 'prev';
const STAY = 'stay';
const COMMANDS = [NEXT, PREV, STAY];

const ITEMS_CHANGED = 'items-changed';
const ITEM_CHANGED = 'item-changed';
const FINISHED = 'finished-changed';

class PrendusCarouselTest extends Polymer.Element {

  static get is() { return 'prendus-carousel-test' }

  constructor() {
    super();
    this.componentId = createUUID();
    this.rootReducer = RootReducer;
  }

  prepareTests(test) {

    test('Carousel takes array next and previous commands', [dataArb], async (data: number[]) => {
      const carousel = this.shadowRoot.querySelector('prendus-carousel');
      const setup = getListener(ITEMS_CHANGED, carousel)
      carousel.items = data;
      await setup;
      const initial = { index: 0, item: data[0], finished: !data.length };
      if (!verifyCarousel(initial, carousel)) {
        return false;
      }
      const iterations = (new Array(100)).fill(0); //Just an array to pass to asyncMap for convenience
      const results = await asyncMap(iterations, async _ => {
        const command = randomCommand();
        const expected = getExpected(carousel, command);
        const event = getEvent(carousel, command);
        executeCommand(carousel, command);
        await event;
        const success = verifyCarousel(expected, carousel);
        return success;
      });
      return results.reduce((success, nextCase) => success && nextCase, true);
    });
  }
}

function verifyCarousel(expect, carousel): boolean {
  return carousel.index === expect.index
    && carousel.item === expect.item
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
  const index = carousel.index;
  const items = carousel.items;
  switch (command) {
    case NEXT:
      return items[index] === items[index + 1]
        ? Promise.resolve()
        : getListener(ITEM_CHANGED, carousel);
    case PREV:
      return !index || items[index] === items[index - 1]
        ? Promise.resolve()
        : getListener(ITEM_CHANGED, carousel);
    default:
      return Promise.resolve();
  }
}

function getExpected(carousel, command) {
  const index = carousel.index;
  const items = carousel.items;
  const item = carousel.item;
  const finished = carousel.finished;
  const currentState = { index, item, finished };
  switch (command) {
    case NEXT:
      return carousel.finished
        ? currentState
        : {
          index: index + 1,
          item: items[index + 1],
          finished: index + 1 === items.length
        };
    case PREV:
      return !index
        ? currentState
        : {
          index: index - 1,
          item: items[index - 1],
          finished: false
        };
    default:
      return currentState;
  }
}

window.customElements.define(PrendusCarouselTest.is, PrendusCarouselTest);

