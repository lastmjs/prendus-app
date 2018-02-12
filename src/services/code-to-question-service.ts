import {parse} from '../node_modules/assessml/assessml';

export function compileToGuiQuestion(text: string, code: string): GuiQuestion {
    const amlAst = parse(text);
    const { answer } = extractVariables(code);

    const answer1 = {
        type: AnswerTypes.MultipleChoice,
        correct: answer.left.left.left.right.value,
        text: amlAst.ast.filter((astObject) => {
            return astObject.varName === answer.left.left.left.left.name;
        })[0].content[0].content
    };

    const answer2 = {
        type: AnswerTypes.MultipleChoice,
        correct: answer.left.left.right.right.value,
        text: amlAst.ast.filter((astObject) => {
            return astObject.varName === answer.left.left.right.left.name;
        })[0].content[0].content
    };

    const answer3 = {
        type: AnswerTypes.MultipleChoice,
        correct: answer.left.right.right.value,
        text: amlAst.ast.filter((astObject) => {
            return astObject.varName === answer.left.right.left.name;
        })[0].content[0].content
    };

    const answer4 = {
        type: AnswerTypes.MultipleChoice,
        correct: answer.right.right.value,
        text: amlAst.ast.filter((astObject) => {
            return astObject.varName === answer.right.left.name;
        })[0].content[0].content
    };

    return {
        stem: amlAst.ast[0].content.replace('<p>', '').replace('</p><p>', ''),
        answers: [answer1, answer2, answer3, answer4]
    };
}

export function extractVariables(code: string): {[key: string]: any} {
  const ast = esprima.parse(code);
  return ast.body.filter(isVariable).reduce((vars, node) => {
    return {...vars, [node.expression.left.name]: node.expression.right};
  }, {});
}

function isVariable(node: object): boolean {
  return node.type === 'ExpressionStatement'
    && node.expression
    && node.expression.type === 'AssignmentExpression'
    && node.expression.left
    && node.expression.left.type === 'Identifier'
    && node.expression.right
}

