import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {User} from '../../typings/user';
import {createUUID} from '../../services/utilities-service';

class PrendusRubricTable extends Polymer.Element {
  loaded: boolean;
  action: SetPropertyAction | SetComponentPropertyAction;
  componentId: string;
  userToken: string | null;
  user: User;

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
    this._fireLocalAction('loaded', true);
  }

  _fireLocalAction(key: string, value: any) {
    this.action = {
      type: 'SET_COMPONENT_PROPERTY',
      componentId: this.componentId,
      key,
      value
    };
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

  _makeRubric(categories: object[]): object {
    return categories.reduce((rubric, category) => {
      return Object.assign(
        rubric,
        {[category.name]: category.options.reduce((options, option) => {
          return Object.assign(
            options,
            {[option.name]: {description: option.description, points: Number(option.points)}}
          );
        }, {})}
      );
    }, {});
  }

  _notify(rubric: Rubric) {
    const evt = new CustomEvent('rubric-changed', {composed: true, detail: {rubric}});
    this.dispatchEvent(evt);
  }

  _initCategories(rubric: Rubric) {
    const categories = this._categoriesForHtml(rubric);
    if (!categories.length && this.editable)
      this._fireLocalAction('categories', this.templateRubric());
    else
      this._fireLocalAction('categories', categories);
  }

  templateRubric(): object[] {
    return [
      {
        name: '',
        options: this.templateOption()
      }
    ];
  }

  templateOption(): object[] {
    return [
      {
        name: '',
        description: '',
        points: 0
      }
    ]
  }

  addCategory() {
    this._fireLocalAction('categories', this.categories.concat(this.templateRubric()));
  }

  removeCategory() {
    const newRubric = this.categories.length ? this.categories.slice(0, this.categories.length - 1) : this.categories;
    this._fireLocalAction('categories', newRubric);
  }

  addScale(e: Event) {
    const newRubric = this.categories.map((category, i) => {
      if (i === e.model.itemsIndex)
        return {
          name: category.name,
          options: category.options.concat(this.templateOption())
        }
      return category;
    });
    this._fireLocalAction('categories', newRubric);
  }

  removeScale(e: Event) {
    const newRubric = this.categories.map((category, i) => {
      if (i === e.model.itemsIndex)
        return {
          name: category.name,
          options: category.options.length ? category.options.slice(0, category.options.length - 1) : category.options
        }
      return category;
    });
    this._fireLocalAction('categories', newRubric);
  }

  setCategory(e: Event) {
    const newCategories = this.categories.slice();
    newCategories[e.model.itemsIndex].name = e.target.value;
    this._fireLocalAction('categories', newCategories);
    this._notify(this._makeRubric(newCategories));
  }

  setOptionProp(e: Event, prop) {
    const i = this.shadowRoot.getElementById('categories').indexForElement(e.target);
    const newCategories = this.categories.slice();
    newCategories[i].options[e.model.itemsIndex][prop] = e.target.value;
    this._fireLocalAction('categories', newCategories);
    this._notify(this._makeRubric(newCategories));
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
    const keys = Object.keys(componentState);
    if (keys.includes('loaded')) this.loaded = componentState.loaded;
    if (keys.includes('categories')) this.categories = componentState.categories;
    if (keys.includes('rubric')) this.rubric = componentState.rubric;
    this.userToken = state.userToken;
    this.user = state.user;
  }

}

window.customElements.define(PrendusRubricTable.is, PrendusRubricTable)
