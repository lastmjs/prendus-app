import {ContainerElement} from '../../typings/container-element';

class PrendusButton extends Polymer.Element implements ContainerElement {
    static get is() { return 'prendus-button'; }
}

window.customElements.define(PrendusButton.is, PrendusButton);
