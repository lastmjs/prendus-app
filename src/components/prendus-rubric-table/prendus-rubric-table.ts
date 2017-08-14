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
        type: Array,
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
    (this.rubric && this.rubric.length) || this._fireLocalAction('rubric', this.editable ? this.templateRubric() : '');
    this._fireLocalAction('loaded', true);
    console.log(this.rubric, this.editable);
  }

  _fireLocalAction(key: string, value: any) {
    this.action = {
      type: 'SET_COMPONENT_PROPERTY',
      componentId: this.componentId,
      key,
      value
    };
  }

  templateRubric(): Object[] {
    return [
      {
        name: '',
        scales: this.templateScale()
      }
    ];
  }

  templateScale(): Object[] {
    return [
      {
        name: '',
        description: '',
        points: 0
      }
    ]
  }

  addCategory() {
    this._fireLocalAction('rubric', this.rubric.concat(this.templateRubric()));
  }

  removeCategory() {
    const newRubric = this.rubric.length ? this.rubric.slice(0, this.rubric.length - 1) : this.rubric;
    this._fireLocalAction('rubric', newRubric);
  }

  addScale(e) {
    const newRubric = this.rubric.map((category, i) => {
      if (i === e.model.itemsIndex)
        return {
          name: category.name,
          scales: category.scales.concat(this.templateScale())
        }
      return category;
    });
    this._fireLocalAction('rubric', newRubric);
  }

  removeScale(e) {
    const newRubric = this.rubric.map((category, i) => {
      if (i === e.model.itemsIndex)
        return {
          name: category.name,
          scales: category.scales.length ? category.scales.slice(0, category.scales.length - 1) : category.scales
        }
      return category;
    });
    this._fireLocalAction('rubric', newRubric);
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    const keys = Object.keys(componentState);
    if (keys.includes('loaded')) this.loaded = componentState.loaded;
    if (keys.includes('rubric')) this.rubric = componentState.rubric;
    this.userToken = state.userToken;
    this.user = state.user;
  }

}

window.customElements.define(PrendusRubricTable.is, PrendusRubricTable)
