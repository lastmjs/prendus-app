import {createUUID, fireLocalAction} from '../../node_modules/prendus-shared/services/utilities-service';

class PrendusDeleteConfirmationModal extends Polymer.Element implements ContainerElement {
    primaryRedirectUrl: string;
    componentId: string;
    open: string;

    static get is() { return 'prendus-delete-confirmation-modal'; }
    static get properties() {
        return {
          open: {
            type: String,
            observer: 'openModal'
          }
        };
    }
    constructor() {
        super();
        this.componentId = createUUID();
    }
    connectedCallback() {
        super.connectedCallback();
    }
    closeConfirmDeleteConfirmationModal(e){
      this.shadowRoot.querySelector('#prendus-modal').close();
    }
    raiseDeleteEvent(e){
      this.dispatchEvent(new CustomEvent('delete', {
          bubbles: false
      }));
      this.shadowRoot.querySelector('#prendus-modal').close();
    }
    openModal(e){
      console.log('modal opening')
      this.shadowRoot.querySelector('#prendus-modal').open();
    }
}

window.customElements.define(PrendusDeleteConfirmationModal.is, PrendusDeleteConfirmationModal);
