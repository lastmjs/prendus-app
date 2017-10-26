import {RootReducer} from '../../../../src/redux/reducers';
import {asyncMap} from '../../../../src/node_modules/prendus-shared/services/utilities-service';
import {
  Rubric,
  CategoryScore
} from '../../../../typings/index.d';
import {RubricArb} from '../../services/arbitraries-service';
import {
  getListener,
  randomIndex
} from '../../services/utilities-service';

const ADD_CATEGORY = 'addCategory';
const REMOVE_CATEGORY = 'removeCategory';
const ADD_SCALE = 'addScale';
const REMOVE_SCALE = 'removeScale';
const SET_CATEGORY = 'setCategory';
const SET_OPTION = 'setOption';
const SET_DESCRIPTION = 'setDescription';
const SET_POINTS = 'setPoints';
const COMMANDS = [ADD_CATEGORY, REMOVE_CATEGORY, ADD_SCALE, REMOVE_SCALE, SET_CATEGORY, SET_DESCRIPTION, SET_POINTS];

const RUBRIC_CHANGED = 'rubric-changed';

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

function randomCommand() {
  return COMMANDS[randomIndex(COMMANDS.length)];
}


window.customElements.define(PrendusRubricTableTest.is, PrendusRubricTableTest);
