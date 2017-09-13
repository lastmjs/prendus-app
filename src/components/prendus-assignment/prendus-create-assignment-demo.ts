import {createUUID, shuffleArray} from '../../services/utilities-service';
import {SetComponentPropertyAction} from '../../typings/actions';
import {State} from '../../typings/state';
import {compileToAssessML} from '../../node_modules/assessml/assessml';
import {AST, Content, Radio} from '../../node_modules/assessml/assessml.d';

class PrendusCreateAssignmentDemo extends Polymer.Element {
    componentId: string;
    selected: number;
    action: SetComponentPropertyAction;
    question: {
        text: string;
        code: string;
    };
    ast: AST;
    correctAnswerRadioNumber: number;
    incorrectAnswer1RadioNumber: number;
    incorrectAnswer2RadioNumber: number;
    incorrectAnswer3RadioNumber: number;

    static get is() { return 'prendus-create-assignment-demo'; }

    constructor() {
      super();
      this.componentId = createUUID();
    }

    connectedCallback() {
        super.connectedCallback();

        this.action = fireLocalAction(this.componentId, 'selected', 0);
        this.action = fireLocalAction(this.componentId, 'ast', {
            type: 'AST',
            ast: [{
                type: 'CONTENT',
                content: ''
            }, {
                type: 'CONTENT',
                content: '<p></p>'
            }, {
                // placeholder for a radio
            }, {
                type: 'CONTENT',
                content: '<p></p>'
            }, {
                // placeholder for a radio
            }, {
                type: 'CONTENT',
                content: '<p></p>'
            }, {
                // placeholder for a radio
            }, {
                type: 'CONTENT',
                content: '<p></p>'
            }, {
                // placeholder for a radio
            }, {
                type: 'CONTENT',
                content: '<p></p>'
            }]
        });

        const radioNumbers = shuffleArray([1, 2, 3, 4]);

        this.action = fireLocalAction(this.componentId, 'correctAnswerRadioNumber', radioNumbers[0]);
        this.action = fireLocalAction(this.componentId, 'incorrectAnswer1RadioNumber', radioNumbers[1]);
        this.action = fireLocalAction(this.componentId, 'incorrectAnswer2RadioNumber', radioNumbers[2]);
        this.action = fireLocalAction(this.componentId, 'incorrectAnswer3RadioNumber', radioNumbers[3]);
        this.action = fireLocalAction(this.componentId, 'question', {
            text: '',
            code: `answer = radio${radioNumbers[0]} === true;`
        });
    }

    selectedChanged(e: CustomEvent) {
        this.action = fireLocalAction(this.componentId, 'selected', e.detail.value);
    }

    editorTextChanged(e: CustomEvent) {
        this.action = fireLocalAction(this.componentId, 'question', {
            ...this.question,
            text: e.detail.text,
            code: this.question ? this.question.code : ''
        });
    }

    editorCodeChanged(e: CustomEvent) {
        this.action = fireLocalAction(this.componentId, 'question', {
            ...this.question,
            text: this.question ? this.question.text : '',
            code: e.detail.code
        });
    }

    questionInputChanged(e: Event) {
        const questionInput: HTMLInputElement = this.shadowRoot.querySelector('#questionInput');

        this.action = fireLocalAction(this.componentId, 'ast', {
            ...this.ast,
            ast: [{
                ...this.ast.ast[0],
                content: `<p>${questionInput.value}</p>`
            }, ...this.ast.ast.slice(1)]
        });

        this.action = fireLocalAction(this.componentId, 'question', createNewQuestionFromAst(this.question, this.ast));
    }

    correctAnswerInputChanged(e: Event) {
        const correctAnswerInput: HTMLInputElement = this.shadowRoot.querySelector('#correctAnswerInput');

        this.action = fireLocalAction(this.componentId, 'ast', {
            ...this.ast,
            ast: [...this.ast.ast.slice(0, this.correctAnswerRadioNumber * 2), {
                type: 'RADIO',
                varName: `radio${this.correctAnswerRadioNumber}`,
                content: [{
                    type: 'CONTENT',
                    content: correctAnswerInput.value
                }]
            }, ...this.ast.ast.slice(this.correctAnswerRadioNumber * 2 + 1)]
        });

        this.action = fireLocalAction(this.componentId, 'question', createNewQuestionFromAst(this.question, this.ast));
    }

    incorrectAnswerInput1Changed(e: Event) {
        const incorrectAnswerInput1: HTMLInputElement = this.shadowRoot.querySelector('#incorrectAnswerInput1');

        this.action = fireLocalAction(this.componentId, 'ast', {
            ...this.ast,
            ast: [...this.ast.ast.slice(0, this.incorrectAnswer1RadioNumber * 2), {
                type: 'RADIO',
                varName: `radio${this.incorrectAnswer1RadioNumber}`,
                content: [{
                    type: 'CONTENT',
                    content: incorrectAnswerInput1.value
                }]
            }, ...this.ast.ast.slice(this.incorrectAnswer1RadioNumber * 2 + 1)]
        });

        this.action = fireLocalAction(this.componentId, 'question', createNewQuestionFromAst(this.question, this.ast));
    }

    incorrectAnswerInput2Changed(e: Event) {
        const incorrectAnswerInput2: HTMLInputElement = this.shadowRoot.querySelector('#incorrectAnswerInput2');

        this.action = fireLocalAction(this.componentId, 'ast', {
            ...this.ast,
            ast: [...this.ast.ast.slice(0, this.incorrectAnswer2RadioNumber * 2), {
                type: 'RADIO',
                varName: `radio${this.incorrectAnswer2RadioNumber}`,
                content: [{
                    type: 'CONTENT',
                    content: incorrectAnswerInput2.value
                }]
            }, ...this.ast.ast.slice(this.incorrectAnswer2RadioNumber * 2 + 1)]
        });

        this.action = fireLocalAction(this.componentId, 'question', createNewQuestionFromAst(this.question, this.ast));
    }

    incorrectAnswerInput3Changed(e: Event) {
        const incorrectAnswerInput3: HTMLInputElement = this.shadowRoot.querySelector('#incorrectAnswerInput3');

        this.action = fireLocalAction(this.componentId, 'ast', {
            ...this.ast,
            ast: [...this.ast.ast.slice(0, this.incorrectAnswer3RadioNumber * 2), {
                type: 'RADIO',
                varName: `radio${this.incorrectAnswer3RadioNumber}`,
                content: [{
                    type: 'CONTENT',
                    content: incorrectAnswerInput3.value
                }]
            }, ...this.ast.ast.slice(this.incorrectAnswer3RadioNumber * 2 + 1)]
        });


        this.action = fireLocalAction(this.componentId, 'question', createNewQuestionFromAst(this.question, this.ast));
    }

    showEditQuestion(selected: number) {
        return selected !== 5;
    }

    nextClick(e: Event) {
        this.action = fireLocalAction(this.componentId, 'selected', this.selected + 1);
    }

    prevClick(e: Event) {
        this.action = fireLocalAction(this.componentId, 'selected', this.selected - 1);
    }

    submitClick(e: Event) {
        alert('Submitted');
    }

    showPrevButton(selected: number) {
        return selected !== 0;
    }

    showNextButton(selected: number) {
        return selected !== 5;
    }

    showSubmitButton(selected: number) {
        return selected === 5;
    }

    stateChange(e: CustomEvent) {
        const state: State = e.detail.state;

        if (state.components[this.componentId]) this.selected = state.components[this.componentId].selected;
        if (state.components[this.componentId]) this.question = state.components[this.componentId].question;
        if (state.components[this.componentId]) this.ast = state.components[this.componentId].ast;
        if (state.components[this.componentId]) this.correctAnswerRadioNumber = state.components[this.componentId].correctAnswerRadioNumber;
        if (state.components[this.componentId]) this.incorrectAnswer1RadioNumber = state.components[this.componentId].incorrectAnswer1RadioNumber;
        if (state.components[this.componentId]) this.incorrectAnswer2RadioNumber = state.components[this.componentId].incorrectAnswer2RadioNumber;
        if (state.components[this.componentId]) this.incorrectAnswer3RadioNumber = state.components[this.componentId].incorrectAnswer3RadioNumber;
    }
}

window.customElements.define(PrendusCreateAssignmentDemo.is, PrendusCreateAssignmentDemo);

function fireLocalAction(componentId: string, key: string, value: any): SetComponentPropertyAction {
    return {
        type: 'SET_COMPONENT_PROPERTY',
        componentId,
        key,
        value
  };
}

function createNewQuestionFromAst(question: { text: string; code: string }, ast: AST ) {
    return {
        ...question,
        text: compileToAssessML(ast, () => 5), //TODO this will create incorrect variable values, just using a simple function for now
        code: question ? question.code : ''
    }
}
