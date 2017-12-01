import {
  AuthResult
} from '../../../prendus.d';
import {
  navigate
} from '../../node_modules/prendus-shared/services/utilities-service';

class PrendusUnauthorizedModal extends Polymer.Element {
  open: boolean;
  result: AuthResult;

  static get is() { return 'prendus-unauthorized-modal' }

  static get properties() {
    return {
      open: {
        type: Boolean,
        value: false,
      },
      result: {
        type: Object,
        value: () => ({
          authenticated: false
        })
      }
    }
  }

  _pay(e: Event) {
    navigate(`/course/${this.result.courseId}/payment?redirectUrl=${encodeURIComponent(`${window.location.href}`)}`);
  }

  _authenticate(e: Event) {
    navigate(`/authenticate?redirectUrl=${encodeURIComponent(`${window.location.pathname}`)}`);
  }

  _home(e: Event) {
    navigate('/');
  }

  _payMessage(result: AuthResult): boolean {
    return result.authenticated && !result.payed;
  }

}

window.customElements.define(PrendusUnauthorizedModal.is, PrendusUnauthorizedModal);
