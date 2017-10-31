import {
  SetComponentPropertyAction,
  User,
  Rubric,
} from '../../typings/index.d';
import {
  createUUID,
  fireLocalAction
} from '../../node_modules/prendus-shared/services/utilities-service';

class PrendusRubricTable extends Polymer.Element {
  loaded: boolean;
  action: SetComponentPropertyAction;
  componentId: string;
  editable: boolean;
  categories: object[];
  rubric: Rubric;

  static get is() { return 'prendus-rubric-table' }
  static get properties() {
    return {
      editable: {
        type: Boolean,
        value: false
      },
      init: {
        type: Object,
        observer: '_initCategories'
      },
      categories: {
        type: Array,
        notify: true
      },
      rubric: {
        type: Object,
        notify: true
      }
    }
  }

  constructor() {
    super();
    this.componentId = createUUID();
  }

  connectedCallback() {
    super.connectedCallback();
    this.action = fireLocalAction(this.componentId, 'loaded', true);
  }

  _initCategories(init: Rubric) {
    const categories = categoriesForHtml(init);
    if (!categories.length && this.editable) {
      this.action = fireLocalAction(this.componentId, 'categories', [templateCategory()]);
      this.action = fireLocalAction(this.componentId, 'rubric', makeRubric([templateCategory()]));
    }
    else {
      this.action = fireLocalAction(this.componentId, 'categories', categories);
      this.action = fireLocalAction(this.componentId, 'rubric', init);
    }
  }

  addCategory() {
    if (!this.editable) return;
    this.action = fireLocalAction(this.componentId, 'categories', [...this.categories, templateCategory()]);
  }

  removeCategory() {
    if (!this.editable) return;
    const newCategories = this.categories.slice(0, this.categories.length - 1)
    this.action = fireLocalAction(this.componentId, 'categories', newCategories);
    this.action = fireLocalAction(this.componentId, 'rubric' makeRubric(newCategories));
  }

  addScale(e: Event) {
    if (!this.editable) return;
    const newCategories = this.categories.map((category, i) =>
      i === e.model.itemsIndex
        ? {...category, options: [...category.options, templateOption()]}
        : category
    );
    this.action = fireLocalAction(this.componentId, 'categories', newCategories);
  }

  removeScale(e: Event) {
    if (!this.editable) return;
    const newCategories = this.categories.map((category, i) =>
      i === e.model.itemsIndex
        ? {...category, options: category.options.slice(0, -1)}
        : category
    );
    this.action = fireLocalAction(this.componentId, 'categories', newCategories);
    this.action = fireLocalAction(this.componentId, 'rubric' makeRubric(newCategories));
  }

  setCategory(e: Event) {
    if (!this.editable) return;
    const newCategories = [...this.categories];
    newCategories[e.model.itemsIndex].name = e.target.value;
    this.action = fireLocalAction(this.componentId, 'categories', newCategories);
    this.action = fireLocalAction(this.componentId, 'rubric', makeRubric(newCategories));
    console.log('setting categories');
  }

  setOptionProp(e: Event, prop) {
    if (!this.editable) return;
    const i = this.shadowRoot.getElementById('categories').indexForElement(e.target);
    const newCategories = [...this.categories];
    newCategories[i].options[e.model.itemsIndex][prop] = e.target.value;
    this.action = fireLocalAction(this.componentId, 'categories', newCategories);
    this.action = fireLocalAction(this.componentId, 'rubric', makeRubric(newCategories));
  }

  setOption(e: Event) {
    this.setOptionProp(e, 'name');
  }

  setDescription(e: Event) {
    this.setOptionProp(e, 'description');
  }

  setPoints(e: Event) {
    this.setOptionProp(e, 'points');
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    this.loaded = componentState.loaded;
    this.categories = componentState.categories;
    this.rubric = componentState.rubric;
  }
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

function categoriesForHtml(rubric: Rubric): object[] {
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

function makeRubric(categories: object[]): Rubric {
  return categories.reduce((rubric, category) => {
    return {
      ...rubric,
      [category.name]: category.options.reduce((options, option) => {
        return {
          ...options,
          [option.name]: {description: option.description, points: Number(option.points)}
        }
      }, {})
    };
  }, {});
}

window.customElements.define(PrendusRubricTable.is, PrendusRubricTable)
