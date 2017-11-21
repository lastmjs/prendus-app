class PrendusUnauthorizedModal extends Polymer.Element {
  opened: boolean;

  static get is() { return 'prendus-unauthorized-modal' }

  static get properties() {
    return {
      opened: {
        type: Boolean,
        value: false,
        observer: '_openedChanged'
      }
    }
  }

  constructor() {
    super();
    this.componentId = createUUID();
  }

  _openedChanged(opened: boolean) {
    if (opened)
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
