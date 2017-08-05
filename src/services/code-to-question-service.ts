import {Question} from '../typings/question';
import {GuiQuestion} from '../typings/gui-question';
import {GuiAnswer} from '../typings/gui-answer';
import {AnswerTypes} from '../typings/answer-types';
import {parse} from '../node_modules/assessml/assessml';

export function compileToGuiQuestion(text: string, code: string): GuiQuestion {
    const amlAst = parse(text);
    const jsAst = esprima.parse(code);

    const answer1 = {
        type: AnswerTypes.MultipleChoice,
        correct: jsAst.body[0].expression.right.left.left.left.right.value,
        text: amlAst.ast.filter((astObject) => {
            return astObject.varName === jsAst.body[0].expression.right.left.left.left.left.name;
        })[0].content[0].content
    };

    const answer2 = {
        type: AnswerTypes.MultipleChoice,
        correct: jsAst.body[0].expression.right.left.left.right.right.value,
        text: amlAst.ast.filter((astObject) => {
            return astObject.varName === jsAst.body[0].expression.right.left.left.right.left.name;
        })[0].content[0].content
    };

    const answer3 = {
        type: AnswerTypes.MultipleChoice,
        correct: jsAst.body[0].expression.right.left.right.right.value,
        text: amlAst.ast.filter((astObject) => {
            return astObject.varName === jsAst.body[0].expression.right.left.right.left.name;
        })[0].content[0].content
    };

    const answer4 = {
        type: AnswerTypes.MultipleChoice,
        correct: jsAst.body[0].expression.right.right.right.value,
        text: amlAst.ast.filter((astObject) => {
            return astObject.varName === jsAst.body[0].expression.right.right.left.name;
        })[0].content[0].content
    };

    return {
        stem: amlAst.ast[0].content.replace('<p>', '').replace('</p><p>', ''),
        answers: [answer1, answer2, answer3, answer4]
    };
}
