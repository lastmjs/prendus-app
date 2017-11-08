import {
  SetComponentPropertyAction,
  SetPropertyAction,
  User,
  Rubric,
} from '../../typings/index.d';
import {
  createUUID,
  fireLocalAction
} from '../../node_modules/prendus-shared/services/utilities-service';
import { setNotification } from '../../redux/actions';
import { NotificationType } from '../../services/constants-service';

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
    const categories = this._categoriesForHtml(init);
    if (!categories.length && this.editable) {
      this.action = fireLocalAction(this.componentId, 'categories', [this._templateCategory()]);
      this.action = fireLocalAction(this.componentId, 'rubric', this._makeRubric([this._templateCategory()]));
    }
    else {
      this.action = fireLocalAction(this.componentId, 'categories', categories);
      this.action = fireLocalAction(this.componentId, 'rubric', init);
    }
  }

  addCategory() {
    if (!this.editable) return;
    if (this.categories.some(({ name }) => !name.length)) {
      this.action = setNotification('Please define other categories first', NotificationType.WARNING);
      return;
    }
    const newCategories = [...this.categories, this._templateCategory()];
    this.action = fireLocalAction(this.componentId, 'categories', newCategories);
    this.action = fireLocalAction(this.componentId, 'rubric' this._makeRubric(newCategories));
  }

  removeCategory() {
    if (!this.editable) return;
    const newCategories = this.categories.slice(0, this.categories.length - 1)
    this.action = fireLocalAction(this.componentId, 'categories', newCategories);
    this.action = fireLocalAction(this.componentId, 'rubric' this._makeRubric(newCategories));
  }

  addScale(e: Event) {
    if (!this.editable) return;
    if (this.categories[e.model.itemsIndex].options.some(({ name }) => !name.length)) {
      this.action = setNotification('Please define other scales first', NotificationType.WARNING);
      return;
    }
    const newCategories = this.categories.map((category, i) =>
      i === e.model.itemsIndex
        ? {...category, options: [...category.options, this._templateOption()]}
        : category
    );
    this.action = fireLocalAction(this.componentId, 'categories', newCategories);
    this.action = fireLocalAction(this.componentId, 'rubric' this._makeRubric(newCategories));
  }

  removeScale(e: Event) {
    if (!this.editable) return;
    const newCategories = this.categories.map((category, i) =>
      i === e.model.itemsIndex
        ? {...category, options: category.options.slice(0, -1)}
        : category
    );
    this.action = fireLocalAction(this.componentId, 'categories', newCategories);
    this.action = fireLocalAction(this.componentId, 'rubric' this._makeRubric(newCategories));
  }

  setCategory(e: Event) {
    if (!this.editable) return;
    if (this.categories.some(({ name }) => name === e.target.value)) {
      this.action = setNotification('Please use a different name for each category', NotificationType.WARNING);
      return;
    }
    const newCategories = this.categories.map((category, i) =>
      i === e.model.itemsIndex
        ? { ...category, name: e.target.value }
        : category
    );
    this.action = fireLocalAction(this.componentId, 'categories', newCategories);
    this.action = fireLocalAction(this.componentId, 'rubric', this._makeRubric(newCategories));
  }

  setOption(e: Event) {
    if (!this.editable) return;
    const categoryIndex = this.shadowRoot.getElementById('categories').indexForElement(e.target);
    if (this.categories[categoryIndex].options.some(({ name }) => name === e.target.value)) {
      this.action = setNotification('Please use a different name for each scale', NotificationType.WARNING);
      return;
    }
    const newCategories = this._setOptionProp(this.categories, categoryIndex, e.model.itemsIndex, 'name', e.target.value);
    this.action = fireLocalAction(this.componentId, 'categories', newCategories);
    this.action = fireLocalAction(this.componentId, 'rubric', this._makeRubric(newCategories));
  }

  setDescription(e: Event) {
    if (!this.editable) return;
    const categoryIndex = this.shadowRoot.getElementById('categories').indexForElement(e.target);
    const newCategories = this._setOptionProp(this.categories, categoryIndex, e.model.itemsIndex, 'description', e.target.value);
    this.action = fireLocalAction(this.componentId, 'categories', newCategories);
    this.action = fireLocalAction(this.componentId, 'rubric', this._makeRubric(newCategories));
  }

  setPoints(e: Event) {
    if (!this.editable) return;
    const categoryIndex = this.shadowRoot.getElementById('categories').indexForElement(e.target);
    const newCategories = this._setOptionProp(this.categories, categoryIndex, e.model.itemsIndex, 'points', Number(e.target.value));
    this.action = fireLocalAction(this.componentId, 'categories', newCategories);
    this.action = fireLocalAction(this.componentId, 'rubric', this._makeRubric(newCategories));
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    this.loaded = componentState.loaded;
    this.categories = componentState.categories;
    this.rubric = componentState.rubric;
  }

  //Keeping these in class to use in testing. I am keeping the tests tightly coupled with the implementation of these private
  //methods because it makes maintaining the tests easier and makes it simple to fully simulate the usage of this component
  _setOptionProp(categories: object[], categoryIndex: number, optionIndex: number, prop: string, value: any): object[] {
    return categories.map((category, i) =>
      i === categoryIndex
        ? {
          ...category,
          options: category.options.map((option, j) =>
            j === optionIndex
              ? { ...option, [prop]: value }
              : option
          )
        }
        : category
    );
  }

  _templateCategory(): object[] {
    return {
      name: '',
      options: [this._templateOption()]
    }
  }

  _templateOption(): object[] {
    return {
      name: '',
      description: '',
      points: 0
    }
  }

  _categoriesForHtml(rubric: Rubric): object[] {
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

  _makeRubric(categories: object[]): Rubric {
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
}

window.customElements.define(PrendusRubricTable.is, PrendusRubricTable)
