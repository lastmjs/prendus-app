class PrendusPayment extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `You musta pay!`;
    }
}

window.customElements.define('prendus-payment', PrendusPayment);
