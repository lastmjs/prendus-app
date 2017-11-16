import {RootReducer} from '../../../../src/redux/reducers';
import {asyncMap} from '../../../../src/node_modules/prendus-shared/services/utilities-service';
import {
  Rubric,
  CategoryScore
} from '../../../../typings/index.d';
import {RubricArb} from '../../services/arbitraries-service';
import {
  getListener,
  randomItem
} from '../../services/utilities-service';
import {
  SCORES_CHANGED
} from '../../../../src/services/constants-service';
import {PrendusRubricDropdowns} from '../../../../src/components/prendus-rubric-dropdowns/prendus-rubric-dropdowns';

const jsc = require('jsverify');

class PrendusRubricDropdownsTest extends Polymer.Element {

  static get is() { return 'prendus-rubric-dropdowns-test' }

  constructor() {
    super();
    this.rootReducer = RootReducer;
  }

  async attachDropdowns(rubric: Rubric) {
    const dropdowns = new PrendusRubricDropdowns();
    dropdowns.style.display = 'none';
    this.shadowRoot.appendChild(dropdowns);
    const setup = getListener(SCORES_CHANGED, dropdowns);
    dropdowns.rubric = rubric;
    await setup;
    return dropdowns;
  }

  prepareTests(test) {

    test('Dropdowns functionality', [jsc.nonshrink(RubricArb)], async (rubric: Rubric) => {
      const dropdowns = await this.attachDropdowns(rubric);
      const initial = initialScores(rubric);
      if (!verifyDropdowns(initial, dropdowns))
        return false;
      if (!verifyDropdownsReset(dropdowns))
        return false;
      const success = await jsc.check(dropdownsScore(dropdowns));
      this.shadowRoot.removeChild(dropdowns);
      return success;
    });

  }
}

function dropdownsScore(dropdowns) {
  const rubric: Rubric = dropdowns.rubric;
  const categoryArb = jsc.elements([null, ...Object.keys(rubric)]);
  return jsc.forall(categoryArb, async category => {
    const option = randomOption(rubric, category);
    const event = getEvent(dropdowns, rubric, category, option);
    const scores = getExpected(dropdowns.scores, rubric, category, option);
    scoreCategory(dropdowns, rubric, category, option);
    await event;
    return verifyDropdowns(scores, dropdowns);
  });
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

function randomOption(rubric: Rubric, category: string): string | null {
  return category ? randomItem(Object.keys(rubric[category])) : null;
}

function getExpected(scores: CategoryScore[], rubric: Rubric, category: string, option: string): CategoryScore[] {
  if (!category || !option) return scores;
  const newScores = [...scores];
  const i = newScores.findIndex(score => score.category === category);
  const points = rubric[category][option].points;
  newScores[i].score = points;
  return scores;
}

function getEvent(dropdowns, rubric: Rubric, category: string, option: string): Promise {
  if (!category || !option)
    return Promise.resolve();
  const categoryIndex = Object.keys(rubric).findIndex(_category => _category === category);
  const categoryElement = dropdowns.shadowRoot.querySelectorAll('paper-dropdown-menu').item(categoryIndex);
  const selected = categoryElement.querySelector('paper-listbox').selected;
  return selected === option
    ? Promise.resolve()
    : getListener(SCORES_CHANGED, dropdowns);
}


function scoreCategory(dropdowns, rubric: Rubric, category: string, option: string) {
  if (!category || !option) return;
  const categoryIndex = Object.keys(rubric).findIndex(_category => _category === category);
  const categoryElement = dropdowns.shadowRoot.querySelectorAll('paper-dropdown-menu').item(categoryIndex);
  categoryElement.querySelector('paper-listbox').selected = option;
}

window.customElements.define(PrendusRubricDropdownsTest.is, PrendusRubricDropdownsTest);
