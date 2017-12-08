import {RootReducer} from '../../../../src/redux/reducers';
import {asyncMap} from '../../../../src/node_modules/prendus-shared/services/utilities-service';
import {
  Rubric,
  CategoryScore
} from '../../../../prendus.d';
import {
  RUBRIC_CHANGED,
  CATEGORIES_CHANGED
} from '../../../../src/services/constants-service';
import {
  RubricArb,
} from '../../services/arbitraries-service';
import {
  getListener,
  randomIndex,
  randomItem
} from '../../services/utilities-service';

const jsc = require('jsverify');

const ADD_CATEGORY = 'addCategory';
const REMOVE_CATEGORY = 'removeCategory';
const ADD_SCALE = 'addScale';
const REMOVE_SCALE = 'removeScale';
const SET_CATEGORY = 'setCategory';
const SET_OPTION = 'setOption';
const SET_DESCRIPTION = 'setDescription';
const SET_POINTS = 'setPoints';
const COMMANDS = [ADD_CATEGORY, REMOVE_CATEGORY, ADD_SCALE, REMOVE_SCALE, SET_CATEGORY, SET_DESCRIPTION, SET_POINTS];

const commandArb = jsc.elements(COMMANDS);
const rubricArb = RubricArb;
//I am using this arbitrary because it won't include line sequences, carriage returns and newlines.
//The rubric table seems to handle these fine but the browser strips those sort of charcters
//when processing a change event so it causes the tests to fail
const escapedString = jsc.asciinestring.smap(str => str.replace(/\\|"/g, ''), str => str);

class PrendusRubricTableTest extends Polymer.Element {

  static get is() { return 'prendus-rubric-table-test' }

  constructor() {
    super();
    this.rootReducer = RootReducer;
  }

  async setup(rubric: Rubric) {
    const table = this.shadowRoot.querySelector('prendus-rubric-table');
    const done = getListener(RUBRIC_CHANGED, table);
    table.init = rubric;
    const categories = table._categoriesForHtml(rubric);
    await done;
    return {
      table,
      categories
    };
  }

  prepareTests(test) {

    test('Table loads correct rubric', [rubricArb], async (rubric: Rubric) => {
      const { table, categories } = await this.setup(rubric);
      return verifyTable({ rubric, categories }, table);
    });

    test('User can edit rubric with table', [rubricArb], async (rubric: Rubric) => {
      const { table, categories } = await this.setup(rubric);
      if (!verifyTable({ rubric, categories }, table))
        return false;
      const success = await jsc.check(tableIsEditable(table));
      return success;
    });
  }
}

function tableIsEditable(table) {
  return jsc.forall(
    commandArb, escapedString, jsc.nat,
    async (command, name, points) => {
      const categories = table.categories.map(({ name }) => name);
      const category = randomIndex(categories.length);
      const options = category >= 0 ? table.categories[category].options.map(({ name }) => name) : -1;
      const option = randomIndex(options.length);
      const event = getEvent(table, command, category, option, name);
      const expected = getExpected(table, command, category, option, name, points);
      executeCommand(table, command, category, option, name, points);
      await event;
      const success = verifyTable(expected, table);
      console.log(expected.rubric, table.rubric, expected.categories, table.categories, success);
      return success;
    }
  );
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
  const verifyCategories = categories.every((category, i) => {
    return category.name === tableCategories[i].name
    && category.options.every((option, j) => {
      return option.name === tableCategories[i].options[j].name
      && option.description === tableCategories[i].options[j].description
      && option.points === tableCategories[i].options[j].points
    })
  });
  return verifyRubric && verifyCategories;
}

function getEvent(table, command: string, category: number, option: number, name: string): Promise {
  const categoryDependent = [ADD_SCALE, REMOVE_SCALE, SET_CATEGORY, SET_OPTION, SET_DESCRIPTION, SET_POINTS];
  const optionDependent = [SET_OPTION, SET_DESCRIPTION, SET_POINTS];
  const blankName = obj => !obj.name.length;
  const sameName = str => obj => obj.name.trim() === str.trim();
  if (
    (categoryDependent.includes(command) && category < 0) ||
    (optionDependent.includes(command) && option < 0) ||
    (command === ADD_CATEGORY && table.categories.some(blankName)) ||
    (command === ADD_SCALE && table.categories[category].options.some(blankName)) ||
    (command === SET_CATEGORY && table.categories.some(sameName(name))) ||
    (command === SET_OPTION && table.categories[category].options.some(sameName(name)))
  ) return Promise.resolve();
  return getListener(CATEGORIES_CHANGED, table);
}


function getExpected(table, command: string, category: number, option: number, name: string, points: number): Rubric {
  const { rubric, categories } = table;
  switch (command) {
    case ADD_CATEGORY:
      return stateAfterAddCategory(table, rubric, categories);
    case REMOVE_CATEGORY
      return stateAfterRemoveCategory(table, rubric, categories, category);
    case ADD_SCALE
      return stateAfterAddScale(table, rubric, categories, category);
    case REMOVE_SCALE:
      return stateAfterRemoveScale(table, rubric, categories, category, option);
    case SET_CATEGORY:
      return stateAfterSetCategory(table, rubric, categories, category, name);
    case SET_OPTION:
      return stateAfterSetOption(table, rubric, categories, category, option, name);
    case SET_DESCRIPTION:
      return stateAfterSetDescription(table, rubric, categories, category, option, name);
    case SET_POINTS:
      return stateAfterSetPoints(table, rubric, categories, category, option, points);
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
      if (category >= 0)
        table.shadowRoot.querySelectorAll('.add-scale').item(category).click();
      break;
    case REMOVE_SCALE:
      if (category >= 0)
        table.shadowRoot.querySelectorAll('.remove-scale').item(category).click();
      break;
    case SET_CATEGORY:
      if (category >= 0)
        simulateOnChange(
          table.shadowRoot.querySelectorAll('.category-name').item(category),
          name
        );
      break;
    case SET_OPTION:
      if (category >= 0 && option >= 0)
        simulateOnChange(
          table.shadowRoot.querySelectorAll('.category').item(category).querySelectorAll('.option-name').item(option)
          name
        );
      break;
    case SET_DESCRIPTION:
      if (category >= 0 && option >= 0)
        simulateOnChange(
          table.shadowRoot.querySelectorAll('.category').item(category).querySelectorAll('.description').item(option)
          name
        );
      break;
    case SET_POINTS:
      if (category >= 0 && option >= 0)
        simulateOnChange(
          table.shadowRoot.querySelectorAll('.category').item(category).querySelectorAll('.points').item(option)
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

function stateAfterAddCategory(table, rubric: Rubric, categories: object[]): object {
  const _categories = categories.some(({ name }) => !name.length)
    ? categories
    : categories.concat(table._templateCategory());
  return {
    rubric: table._makeRubric(_categories),
    categories: _categories
  };
}

function stateAfterRemoveCategory(table, rubric: Rubric, categories: object[], category: number): object {
  const _categories = categories.slice(0, -1);
  return {
    rubric: table._makeRubric(_categories),
    categories: _categories
  };
}

function stateAfterAddScale(table, rubric: Rubric, categories: object[], category: number): object {
  const _categories = category >= 0 && !categories[category].options.some(({ name }) => !name.length)
    ? categories.map(
      ({ name, options }, i) => i === category
        ? { name, options: options.concat(table._templateOption()) }
        : { name, options }
      )
      : categories;
  return {
    rubric: table._makeRubric(_categories),
    categories: _categories
  };
}

function stateAfterRemoveScale(table, rubric: Rubric, categories: object[], category: number, option: number): object {
  const _categories = category >= 0 && option >= 0
    ? categories.map(
      ({ name, options }, i) => i === category
        ? { name, options: options.slice(0, -1) }
        : { name, options }
      )
    : categories;
  return {
    rubric: table._makeRubric(_categories),
    categories: _categories
  };
}

function stateAfterSetCategory(table, rubric: Rubric, categories: object[], category: number, name: string): object {
  const _categories = category >= 0 && !categories.some(({ name: _name }) => _name === name)
    ? categories.map(
        (_category, i) => category === i
          ? { ..._category, name }
          : _category
      )
    : categories;
  return {
    rubric: table._makeRubric(_categories),
    categories: _categories
  };
}

function stateAfterSetOption(table, rubric: Rubric, categories: object[], category: number, option: number, name: string): object {
  const _categories = category >= 0 && option >= 0 && !categories[category].options.some(({ name: _name }) => _name === name)
    ? table._setOptionProp(categories, category, option, 'name', name)
    : categories;
  return {
    rubric: table._makeRubric(_categories),
    categories: _categories
  };
}

function stateAfterSetDescription(table, rubric: Rubric, categories: object[], category: number, option: number, name: string): object {
  const _categories = category >= 0 && option >= 0
    ? table._setOptionProp(categories, category, option, 'description', name)
    : categories;
  return {
    rubric: table._makeRubric(_categories),
    categories: _categories
  };
}

function stateAfterSetPoints(table, rubric: Rubric, categories: object[], category: number, option: number, points: number): object {
  const _categories = category >= 0 && option >= 0
    ? table._setOptionProp(categories, category, option, 'points', points)
    : categories;
  return {
    rubric: table._makeRubric(_categories),
    categories: _categories
  };
}

window.customElements.define(PrendusRubricTableTest.is, PrendusRubricTableTest);
