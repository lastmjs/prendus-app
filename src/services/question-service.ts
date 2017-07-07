import {parse, compileToHTML} from '../node_modules/assessml/assessml';
import {asyncMap} from '../services/utilities-service';
import {secureEval} from '../services/secure-eval-service';

export async function buildQuestion(text: string, code: string): Promise<{
    html: string;
    ast: AST
}> {
    const originalAmlAst = parse(text);

    try {
        const jsAst = esprima.parseScript(code);
    }
    catch(error) {
        // This will catch many intermediate syntax errors in the user JavaScript as the user is typing
    }

    const newAmlAst = {
        ...originalAmlAst,
        ast: await asyncMap(originalAmlAst.ast, async (astObject) => {
            if (astObject.type === 'VARIABLE') {
                const newMin = await newPropertyValue(jsAst, astObject.varName, 'min', 0);
                const newMax = await newPropertyValue(jsAst, astObject.varName, 'max', 100);

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

async function newPropertyValue(jsAst, varName: string, propertyName: string, defaultValue: number): Promise<number> {
    const objectsWithProperty = jsAst.body.filter((bodyObj) => {
        return bodyObj.type === 'ExpressionStatement' && bodyObj.expression.type === 'AssignmentExpression' && bodyObj.expression.left.object && bodyObj.expression.left.object.name === varName && bodyObj.expression.left.property.name === propertyName;
    });

    if (objectsWithProperty.length > 0) {
        return (await secureEval(`
            postMessage({
                result: ${escodegen.generate(objectsWithProperty[0].expression.right)}
            });
        `)).result;
    }
    else {
        return defaultValue;
    }
}

export async function checkAnswer(code: string, userVariables, userInputs, userEssays, userChecks, userRadios) {
    const defineUserVariablesString = userVariables.reduce((result: string, userVariable) => {
        return `${result}let ${userVariable.varName} = new Number(${userVariable.value});`;
    }, '');
    const defineUserInputsString = userInputs.reduce((result: string, userInput) => {
        return `${result}let ${userInput.varName} = '${userInput.value.replace(/'/g, '\\\'')}';`;
    }, '');
    const defineUserEssaysString = userEssays.reduce((result: string, userEssay) => {
        return `${result}let ${userEssay.varName} = '${userEssay.value.replace(/'/g, '\\\'')}';`;
    }, '');
    const defineUserChecksString = userChecks.reduce((result: string, userCheck) => {
        return `${result}let ${userCheck.varName} = ${userCheck.checked};`;
    }, '');
    const defineUserRadiosString = userRadios.reduce((result: string, userRadio) => {
        return `${result}let ${userRadio.varName} = ${userRadio.checked};`;
    }, '');

    const codeToEval = `
        let answer;
        ${defineUserVariablesString}
        ${defineUserInputsString}
        ${defineUserEssaysString}
        ${defineUserChecksString}
        ${defineUserRadiosString}
        ${code}

        postMessage({
            answer
        });
    `;

    return await secureEval(codeToEval);
}