import {Question} from '../typings/question';
import {BuiltQuestion} from '../typings/built-question';
import {parse, compileToHTML} from '../node_modules/assessml/assessml';

export function buildQuestion(text: string, code: string): {
    html: string;
    ast: AST
} {
    const originalAmlAst = parse(text);
    const jsAst = esprima.parseScript(code);
    const newAmlAst = {
        ...originalAmlAst,
        ast: originalAmlAst.ast.map((astObject) => {
            if (astObject.type === 'VARIABLE') {
                const newMin = newPropertyValue(jsAst, astObject.varName, 'min', 0);
                const newMax = newPropertyValue(jsAst, astObject.varName, 'max', 100);

                return {
                    ...astObject,
                    value: Math.floor(Math.random() * (newMax - newMin + 1)) + newMin
                };
            }
            else {
                return astObject;
            }
        })
    };

    return {
        html: compileToHTML(newAmlAst),
        ast: newAmlAst
    };
}

function newPropertyValue(jsAst, varName: string, propertyName: string, defaultValue: number): number {
    const objectsWithProperty = jsAst.body.filter((bodyObj) => {
        return bodyObj.type === 'ExpressionStatement' && bodyObj.expression.type === 'AssignmentExpression' && bodyObj.expression.left.object && bodyObj.expression.left.object.name === varName && bodyObj.expression.left.property.name === propertyName;
    });

    if (objectsWithProperty.length > 0) {
        return eval(escodegen.generate(objectsWithProperty[0].expression.right));
    }
    else {
        return defaultValue;
    }
}
