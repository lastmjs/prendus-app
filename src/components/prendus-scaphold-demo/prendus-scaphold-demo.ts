class PrendusScapholdDemo extends Polymer.Element {
    stemText: string;
    radio1Text: string;
    radio2Text: string;
    radio3Text: string;
    radio4Text: string;

    static get is() { return 'prendus-scaphold-demo'; }

    constructor() {
        super();

        this.question = {
            text: '<p>hello</p>',
            code: ''
        };
    }

    stemInputChanged() {
        console.log('input changed');

        const stemInput = this.shadowRoot.querySelector('#stemInput');

        this.stemText = stemInput.value;

        this.updateQuestion();
    }

    updateQuestion() {
        this.question = {
            ...this.question,
            text: `<p>${this.stemText || ''}</p><p>${this.radio1Text || ''}</p><p>${this.radio2Text || ''}</p>`
        };
    }
}

window.customElements.define(PrendusScapholdDemo.is, PrendusScapholdDemo);
