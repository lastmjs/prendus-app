import {RootReducer} from '../../../../src/redux/reducers';
import {asyncMap} from '../../../../src/node_modules/prendus-shared/services/utilities-service';
import {
  Rubric,
  CategoryScore
} from '../../../../typings/index.d';
import {
  RubricArb,
  escapedString
} from '../../services/arbitraries-service';
import {
  getListener,
  randomIndex,
  randomItem
} from '../../services/utilities-service';

const jsc = require('jsverify');

const randomString = jsc.sampler(escapedString);
const randomNumber = jsc.sampler(jsc.nat);

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
const CATEGORIES_CHANGED = 'categories-changed';

class PrendusRubricTableTest extends Polymer.Element {

  static get is() { return 'prendus-rubric-table-test' }

  constructor() {
    super();
    this.rootReducer = RootReducer;
  }

  prepareTests(test) {
    test('Rubric table functionality', [jsc.nonshrink(RubricArb)], async (rubric: Rubric) => {
      const table = this.shadowRoot.querySelector('prendus-rubric-table');
      const setup = getListener(RUBRIC_CHANGED, table);
      table.init = rubric;
      const categories = makeCategories(rubric);
      await setup;
      if (!verifyTable({ rubric, categories }, table))
        return false;
      const iterations = (new Array(1)).fill(0);
      const results = await asyncMap(iterations, testEditableTable(table));
      return results.every(result => result);
    });
  }
}

function testEditableTable(table) {
  return async _ => {
    const command = 'removeScale';
    console.log(command);
    const categories = Object.keys(table.rubric);
    const category = randomIndex(categories.length);
    console.log('category index', category);
    if (category >= 0) console.log('length', table.categories[category].options.length);
    const option = category >= 0 ? randomIndex(Object.keys(table.rubric[categories[category]]).length) : -1;
    console.log('option index', option);
    const event = getEvent(table, command, category, option);
    console.log(event);
    const name = randomString();
    const points = randomNumber();
    console.log('name and points', name, points);
    const expected = getExpected(table, command, category, option, name, points);
    console.log('expected', expected);
    console.log('current values', table.rubric, table.categories);
    executeCommand(table, command, category, option, name, points);
    await event;
    console.log(verifyTable(expected, table));
    return verifyTable(expected, table);
  }
}

function randomCommand() {
  return randomItem(COMMANDS);
}

function verifyTable(expected: object, table): boolean {
  const tableRubric: Rubric = table.rubric;
  const tableCategories: object[] = table.categories;
  const { rubric, categories } = expected;
  const verifyRubric = Object.keys(rubric).every(category => {
    return tableRubric.hasOwnProperty(category)
      && Object.keys(rubric[category]).every(option => {
        return tableRubric[category].hasOwnProperty(option)
          && tableRubric[category][option].description === rubric[category][option].description
          && tableRubric[category][option].points === rubric[category][option].points;
    })
  });
  const verifyCategories = categories.every(({ name, options }, i) => {
    return name === tableCategories[i].name
    && options.every(({ name, description, points }, j) => {
      console.log(tableCategories[i].options, i, j);
      return name === tableCategories[i].options[j].name
      && description === tableCategories[i].options[j].description
      && points === tableCategories[i].options[j].points
    })
  });
  console.log(verifyRubric, verifyCategories);
  return verifyRubric && verifyCategories;
}

function getEvent(table, command: string, category: number, option: number): Promise {
  return getListener(CATEGORIES_CHANGED, table);
}

function getExpected(table, command: string, category: number, option: number, name: string, points: number): Rubric {
  const { rubric, categories } = table;
  const _categories = [...categories];
  const _rubric = {...rubric};
  switch (command) {
    case ADD_CATEGORY:
      return {
        rubric,
        categories: categories.concat(templateCategory())
      };
    case ADD_SCALE: {
      if (category >= 0)
        _categories[category].options.push(templateOption());
      return {
        rubric,
        categories: _categories
      };
    }
    case REMOVE_CATEGORY: {
      const removed = _categories[_categories.length - 1].name;
      delete _rubric[removed];
      return {
        rubric: _rubric,
        categories: categories.slice(0, -1)
      };
    }
    case REMOVE_SCALE: {
      if (category >= 0 && option >= 0) {
        const categoryName = _categories[category].name;
        const options = _categories[category].options;
        const removed = _categories[category].options[options.length - 1].name;
        _categories[category].options.pop();
        delete _rubric[categoryName][removed];
      }
      return {
        rubric: _rubric,
        categories: _categories
      };
    }
    case SET_CATEGORY: {
      if (category >= 0) {
        const oldName = _categories[category].name;
        const oldCategory = rubric[oldName];
        delete rubric[oldName];
        _categories[category].name = name;
        return {
          rubric: {...rubric, [name]: oldCategory},
          categories: _categories
        };
      }
      return { rubric, categories };
    }
    case SET_OPTION: {
      if (category >= 0 && option >= 0) {
        const categoryName = _categories[category].name;
        const oldName = _categories[category].options[option].name;
        const oldOption = rubric[categoryName][oldName];
        delete rubric[categoryName][oldName];
        _categories[category].options[option].name = name;
        return {
          rubric: { ...rubric, [categoryName]: { ...rubric[categoryName], [name]: oldOption } },
          categories: _categories
        };
      }
      return { rubric, categories };
    }
    case SET_DESCRIPTION: {
      if (category >= 0 && option >= 0) {
        const categoryName = _categories[category].name;
        const optionName = _categories[category].options[option].name;
        _categories[category].options[option].description = name;
        _rubric[categoryName][optionName].description = name;
        return {
          rubric: _rubric,
          categories: _categories
        };
      }
      return { rubric, categories };
    }
    case SET_POINTS: {
      if (category >= 0 && option >= 0) {
        const categoryName = _categories[category].name;
        const optionName = _categories[category].options[option].name;
        _categories[category].options[option].points = points;
        _rubric[categoryName][optionName].points = points;
        return {
          rubric: _rubric,
          categories: _categories
        };
      }
      return { rubric, categories };
    }
    default:
      return { rubric, categories };
  }
}

function executeCommand(table, command: string, category: number, option: number, name: string, points: number) {
  switch(command) {
    case ADD_CATEGORY:
      table.shadowRoot.querySelector('#add-category').click();
      break;
    case REMOVE_CATEGORY:
      table.shadowRoot.querySelector('#remove-category').click();
      break;
    case ADD_SCALE:
      table.shadowRoot.querySelectorAll('.add-scale').item(category).click();
      break;
    case REMOVE_SCALE:
      table.shadowRoot.querySelectorAll('.remove-scale').item(category).click();
      break;
    case SET_CATEGORY:
      if (category >= 0)
        simulateOnChange(
          table.shadowRoot.querySelectorAll('.category').item(category),
          name
        );
      break;
    case SET_OPTION:
      if (category >= 0 && option >= 0)
        simulateOnChange(
          table.shadowRoot.querySelectorAll('.option').item(category + option)
          name
        );
      break;
    case SET_DESCRIPTION:
      if (category >= 0 && option >= 0)
        simulateOnChange(
          table.shadowRoot.querySelectorAll('.description').item(category + option)
          name
        );
      break;
    case SET_POINTS:
      if (category >= 0 && option >= 0)
        simulateOnChange(
          table.shadowRoot.querySelectorAll('.points').item(category + option)
          points
        );
      break;
    default:
      break;
  }
}

function simulateOnChange(el: HTMLElement, value) {
  el.value = value;
  el.dispatchEvent(new Event('change'));
}

function templateCategory(): object[] {
  return {
    name: '',
    options: [templateOption()]
  }
}

function templateOption(): object[] {
  return {
    name: '',
    description: '',
    points: 0
  }
}

function makeCategories(rubric: Rubric): object[] {
  return Object.keys(rubric || {}).map(category => {
    return {
      name: category,
      options: Object.keys(rubric[category]).map(option => {
        return {
          name: option,
          ...rubric[category][option]
        }
      })
    }
  });
}

window.customElements.define(PrendusRubricTableTest.is, PrendusRubricTableTest);
