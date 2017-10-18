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
      rubric: {
        type: Object,
        observer: '_initCategories'
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

  _notify(rubric: Rubric) {
    const evt = new CustomEvent('rubric-changed', {detail: {rubric}});
    this.dispatchEvent(evt);
  }

  _initCategories(rubric: Rubric) {
    const categories = categoriesForHtml(rubric);
    if (!categories.length && this.editable)
      this.action = fireLocalAction(this.componentId, 'categories', templateRubric());
    else
      this.action = fireLocalAction(this.componentId, 'categories', categories);
  }

  addCategory() {
    this.action = fireLocalAction(this.componentId, 'categories', [...this.categories, templateRubric()]);
  }

  removeCategory() {
    const newCategories = this.categories.length
      ? this.categories.slice(0, this.categories.length - 1)
      : this.categories;
    this.action = fireLocalAction(this.componentId, 'categories', newCategories);
  }

  addScale(e: Event) {
    const newCategories = [...this.categories];
    newCategories[e.model.itemsIndex].options.push(templateOption());
    this.action = fireLocalAction(this.componentId, 'categories', newCategories);
  }

  removeScale(e: Event) {
    const newCategories = [...this.categories];
    newRubric[e.model.itemsIndex].options = newRubric[e.model.itemsIndex].options.slice(0, -1);
    this.action = fireLocalAction(this.componentId, 'categories', newCategories);
  }

  setCategory(e: Event) {
    const newCategories = [...this.categories];
    newCategories[e.model.itemsIndex].name = e.target.value;
    this.action = fireLocalAction(this.componentId, 'categories', newCategories);
    this._notify(makeRubric(newCategories));
  }

  setOptionProp(e: Event, prop) {
    const i = this.shadowRoot.getElementById('categories').indexForElement(e.target);
    const newCategories = [...this.categories];
    newCategories[i].options[e.model.itemsIndex][prop] = e.target.value;
    this.action = fireLocalAction(this.componentId, 'categories', newCategories);
    this._notify(makeRubric(newCategories));
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
  }
}

function templateRubric(): object[] {
  return [
    {
      name: '',
      options: templateOption()
    }
  ];
}

function templateOption(): object[] {
  return [
    {
      name: '',
      description: '',
      points: 0
    }
  ]
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
