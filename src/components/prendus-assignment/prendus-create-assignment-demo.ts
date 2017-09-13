import {createUUID} from '../../services/utilities-service';
import {SetComponentPropertyAction} from '../../typings/actions';
import {State} from '../../typings/state';
import {compileToAssessML} from '../../node_modules/assessml/assessml';
import {AST, Content, Radio} from '../../node_modules/assessml/assessml.d';

class PrendusCreateAssignmentDemo extends Polymer.Element {
    componentId: string;
    selected: SetComponentPropertyAction;
    action: SetComponentPropertyAction;
    question: {
        text: string;
        code: string;
    };
    ast: AST;

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
            ast: []
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
        const content: Content = {
            type: 'CONTENT',
            content: `<p>${questionInput.value}</p>`
        };

        this.action = fireLocalAction(this.componentId, 'ast', {
            ...this.ast,
            ast: [content, ...this.ast.ast.slice(1)]
        });

        this.action = fireLocalAction(this.componentId, 'question', createNewQuestionFromAst(this.question, this.ast));
    }

    correctAnswerInputChanged(e: Event) {
        const correctAnswerInput: HTMLInputElement = this.shadowRoot.querySelector('#correctAnswerInput');
        const radio: Radio = {
            type: 'RADIO',
            content: [{
                type: 'CONTENT',
                content: correctAnswerInput.value
            }],
            varName: 'radio1'
        };
        const content: Content = {
            type: 'CONTENT',
            content: '<p></p>'
        };

        this.action = fireLocalAction(this.componentId, 'ast', {
            ...this.ast,
            ast: [...this.ast.ast.slice(0, 1), radio, content, ...this.ast.ast.slice(3)]
        });

        this.action = fireLocalAction(this.componentId, 'question', createNewQuestionFromAst(this.question, this.ast));
    }

    incorrectAnswerInput1Changed(e: Event) {
        const incorrectAnswerInput1: HTMLInputElement = this.shadowRoot.querySelector('#incorrectAnswerInput1');
        const radio: Radio = {
            type: 'RADIO',
            content: [{
                type: 'CONTENT',
                content: incorrectAnswerInput1.value
            }],
            varName: 'radio2'
        };
        const content: Content = {
            type: 'CONTENT',
            content: '<p></p>'
        };

        this.action = fireLocalAction(this.componentId, 'ast', {
            ...this.ast,
            ast: [...this.ast.ast.slice(0, 3), radio, content, ...this.ast.ast.slice(5)]
        });

        this.action = fireLocalAction(this.componentId, 'question', createNewQuestionFromAst(this.question, this.ast));
    }

    incorrectAnswerInput2Changed(e: Event) {
        const incorrectAnswerInput2: HTMLInputElement = this.shadowRoot.querySelector('#incorrectAnswerInput2');
        const radio: Radio = {
            type: 'RADIO',
            content: [{
                type: 'CONTENT',
                content: incorrectAnswerInput2.value
            }],
            varName: 'radio3'
        };
        const content: Content = {
            type: 'CONTENT',
            content: '<p></p>'
        };

        this.action = fireLocalAction(this.componentId, 'ast', {
            ...this.ast,
            ast: [...this.ast.ast.slice(0, 5), radio, content, ...this.ast.ast.slice(7)]
        });

        this.action = fireLocalAction(this.componentId, 'question', createNewQuestionFromAst(this.question, this.ast));
    }

    incorrectAnswerInput3Changed(e: Event) {
        const incorrectAnswerInput3: HTMLInputElement = this.shadowRoot.querySelector('#incorrectAnswerInput3');
        const radio: Radio = {
            type: 'RADIO',
            content: [{
                type: 'CONTENT',
                content: incorrectAnswerInput3.value
            }],
            varName: 'radio4'
        };
        const content: Content = {
            type: 'CONTENT',
            content: '<p></p>'
        };

        this.action = fireLocalAction(this.componentId, 'ast', {
            ...this.ast,
            ast: [...this.ast.ast.slice(0, 7), radio, content, ...this.ast.ast.slice(9)]
        });

        this.action = fireLocalAction(this.componentId, 'question', createNewQuestionFromAst(this.question, this.ast));
    }

    showEditQuestion(selected: number) {
        return selected !== 5;
    }

    stateChange(e: CustomEvent) {
        const state: State = e.detail.state;

        if (state.components[this.componentId]) this.selected = state.components[this.componentId].selected;
        if (state.components[this.componentId]) this.question = state.components[this.componentId].question;
        if (state.components[this.componentId]) this.ast = state.components[this.componentId].ast;
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
