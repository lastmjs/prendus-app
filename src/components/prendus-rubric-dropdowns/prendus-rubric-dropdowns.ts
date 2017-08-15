import {SetPropertyAction, SetComponentPropertyAction} from '../../typings/actions';
import {createUUID} from '../../services/utilities-service';

class PrendusRubricDropdowns extends Polymer.Element {
  loaded: boolean;
  action: SetPropertyAction | SetComponentPropertyAction;
  componentId: string;
  userToken: string | null;
  user: User;

  static get is() { return 'prendus-rubric-dropdowns' }

  static get properties() {
    return {
      categories: {
        type: Array,
        observer: '_initScores'
      },
      scores: {
        type: Object,
        notify: true
      }
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

  reset() {
    const scores = (this.categories || []).reduce((result, category) => {
      return Object.assign(result, { [category.name]: -1 }
    }, {}));
    this._fireLocalAction('scores', scores);
  }

  _initScores(categories: Object[]) {
    this.reset();
  }

  _scoreCategory(e) {
    const { name } = e.model.category;
    const { points } = e.model.option;
    const newScores = Object.assign(this.scores, { [name]: points });
    this._fireLocalAction('scores', newScores);
  }

  connectedCallback() {
    super.connectedCallback();
    this._fireLocalAction('loaded', true);
  }

  categoryId(category: Object, option: Object): string {
    return category.name.replace(/\s/, '-') + option.name.replace(/\s/, '-');
  }

  stateChange(e: CustomEvent) {
    const state = e.detail.state;
    const componentState = state.components[this.componentId] || {};
    const keys = Object.keys(componentState);
    if (keys.includes('loaded')) this.loaded = componentState.loaded;
    if (keys.includes('scores')) this.scores = componentState.scores;
    this.userToken = state.userToken;
    this.user = state.user;
  }

}

window.customElements.define(PrendusRubricDropdowns.is, PrendusRubricDropdowns)
