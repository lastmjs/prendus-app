import {navigate} from '../../node_modules/prendus-shared/services/utilities-service';

class PrendusUnauthorizedModal extends Polymer.Element {

  static get is() { return 'prendus-unauthorized-modal' }

  static get properties() {
    return {
      unauthorized: {
        type: Boolean,
        value: false,
        observer: '_unauthorizedChanged'
      }
    }
  }

  _unauthorizedChanged(unauthorized) {
    if (unauthorized)
      this.shadowRoot.querySelector('#modal').open();
    else
      this.shadowRoot.querySelector('#modal').close();
  }

  _toHome(e: Event) {
    this.shadowRoot.querySelector('#modal').close();
    navigate('/');
  }
}

window.customElements.define(PrendusUnauthorizedModal.is, PrendusUnauthorizedModal);
