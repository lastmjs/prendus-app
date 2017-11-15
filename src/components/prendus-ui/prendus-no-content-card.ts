class PrendusNoContentCard extends Polymer.Element implements ContainerElement {
    primaryRedirectUrl: string;

    static get is() { return 'prendus-no-content-card'; }
    static get properties() {
        return {
          primaryRedirectUrl: {
            type: String,
          },
          secondaryRedirectUrl: {
            type: String,
          },
          parentComponent: {
            type: String,
          },
          plural: {
            type: String,
          },
          displayIcon: {
            type: String,
          }
        };
    }
    constructor() {
        super();
    }
    connectedCallback() {
        super.connectedCallback();
    }
}

window.customElements.define(PrendusNoContentCard.is, PrendusNoContentCard);
