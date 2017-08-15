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
      categories: {
        type: Array,
        notify: true,
        observer: '_categoriesChanged'
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

  _categoriesChanged(categories: Object[]) {
    if (!categories.length && this.editable)
      this._fireLocalAction('categories', this.templateRubric());
    else
      this._fireLocalAction('categories', categories);
  }

  templateRubric(): Object[] {
    return [
      {
        name: '',
        options: this.templateOption()
      }
    ];
  }

  templateOption(): Object[] {
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

  addScale(e) {
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

  removeScale(e) {
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

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    const keys = Object.keys(componentState);
    if (keys.includes('loaded')) this.loaded = componentState.loaded;
    if (keys.includes('categories')) this.categories = componentState.categories;
    this.userToken = state.userToken;
    this.user = state.user;
  }

}

window.customElements.define(PrendusRubricTable.is, PrendusRubricTable)
