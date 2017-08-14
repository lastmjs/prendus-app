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
      editable: Boolean,
      rubric: Array
    }
  }

  constructor() {
    super();
    this.componentId = createUUID();
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

  connectedCallback() {
    super.connectedCallback();
    this.rubric || this._fireLocalAction('rubric', this.editable ? this.templateRubric() : '');
    this._fireLocalAction('loaded', true);
  }

  addCategory() {
    this._fireLocalAction('rubric', this.rubric.concat(this.templateRubric()));
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
