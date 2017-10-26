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

const jsc = require('jsverify');

const SCORES_CHANGED = 'scores-changed';

class PrendusRubricDropdownsTest extends Polymer.Element {

  static get is() { return 'prendus-rubric-dropdowns-test' }

  constructor() {
    super();
    this.rootReducer = RootReducer;
  }

  prepareTests(test) {

    test('Dropdowns functionality', [jsc.nonshrink(RubricArb)], async (rubric: Rubric) => {
      const dropdowns = this.shadowRoot.querySelector('prendus-rubric-dropdowns');
      const setup = getListener(SCORES_CHANGED, dropdowns);
      dropdowns.rubric = rubric;
      await setup;
      const initial = initialScores(rubric);
      if (!verifyDropdowns(initial, dropdowns))
        return false;
      if (!verifyDropdownsReset(dropdowns))
        return false;
      const iterations = (new Array(100)).fill(0);
      const results = await asyncMap(iterations, testDropdownsScoring(dropdowns, rubric));
      return results.every(result => result);
    });

  }
}

function testDropdownsScoring(dropdowns, rubric: Rubric) {
  return async _ => {
    const category = randomCategory(rubric);
    const option = randomOption(rubric, category);
    const event = category && option
      ? getListener(SCORES_CHANGED, dropdowns)
      : Promise.resolve();
    const scores = getExpected(dropdowns.scores, rubric, category, option);
    scoreCategory(dropdowns, rubric, category, option);
    await event;
    return verifyDropdowns(scores, dropdowns);
  }
}

function verifyDropdowns(scores, dropdowns) {
  return scores.every(
    (categoryScore, i) => categoryScore.category === dropdowns.scores[i].category && categoryScore.score === dropdowns.scores[i].score
  );
}

function verifyDropdownsReset(dropdowns) {
  const lists = dropdowns.shadowRoot.querySelectorAll('paper-dropdown-menu paper-listbox');
  return Array.from(lists).every(list => return list.selected === undefined || list.selected === null);
}

function initialScores(rubric: Rubric): CategoryScore[] {
  return Object.keys(rubric).map(
    (category) => ({ category, score: -1 }),
  )
}

function randomCategory(rubric: Rubric): string {
  const categories = Object.keys(rubric);
  return categories.length
    ? categories[randomIndex(categories.length)]
    : null;
}

function randomOption(rubric: Rubric, category: string): string {
  if (!category) return null;
  const options = Object.keys(rubric[category]);
  return options.length
    ? options[randomIndex(options.length)]
    : null;
}

function getExpected(scores: CategoryScore[], rubric: Rubric, category: string, option: string): CategoryScore[] {
  if (!category || !option) return scores;
  const newScores = [...scores];
  const i = newScores.findIndex(score => score.category === category);
  const points = rubric[category][option].points;
  newScores[i].score = points;
  return scores;
}

function scoreCategory(dropdowns, rubric: Rubric, category: string, option: string) {
  if (!category || !option) return;
  const categoryIndex = Object.keys(rubric).findIndex(_category => _category === category);
  const optionIndex = Object.keys(rubric[category]).findIndex(_option => _option === option);
  const categoryElement = dropdowns.shadowRoot.querySelectorAll('paper-dropdown-menu').item(categoryIndex);
  const optionElement = categoryElement.querySelectorAll('paper-item').item(optionIndex);
  optionElement.click();
}

window.customElements.define(PrendusRubricDropdownsTest.is, PrendusRubricDropdownsTest);
