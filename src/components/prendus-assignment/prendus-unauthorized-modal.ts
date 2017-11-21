import {
  navigate
} from '../../node_modules/prendus-shared/services/utilities-service';

class PrendusUnauthorizedModal extends Polymer.Element {
  open: boolean;

  static get is() { return 'prendus-unauthorized-modal' }

  static get properties() {
    return {
      open: {
        type: Boolean,
        value: false,
      },
      payed: {
        type: Boolean,
        value: false,
      },
      authenticated: {
        type: Boolean,
        value: false,
      },
      enrolled: {
        type: Boolean,
        value: false,
      },
      courseId: String,
    }
  }

  _pay(e: Event) {
    navigate(`/course/${this.courseId}/payment?redirectUrl=${encodeURIComponent(`${window.location.href}`)}`);
  }

  _authenticate(e: Event) {
    navigate(`/authenticate?redirectUrl=${encodeURIComponent(`${window.location.pathname}`)}`);
  }

  _home(e: Event) {
    navigate('/');
  }

  _payMessage(authenticated: boolean, payed: boolean): boolean {
    return authenticated && !payed;
  }

}

window.customElements.define(PrendusUnauthorizedModal.is, PrendusUnauthorizedModal);
