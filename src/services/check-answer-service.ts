import {UserAnswerInfo} from '../typings/user-answer-info';
import {ReturnAnswerInfo} from '../typings/return-answer-info';
import {Answer} from '../typings/answer';

export function checkAnswer(code: string, userVariables, userInputs, userEssays, userChecks, userRadios) {
    let answer;
    const defineUserVariablesString = userVariables.reduce((result: string, userVariable) => {
        return `${result}let ${userVariable.varName} = new Number(${userVariable.value});`;
    }, '');
    const defineUserInputsString = userInputs.reduce((result: string, userInput) => {
        return `${result}let ${userInput.varName} = '${userInput.value}';`; //TODO we must protect against single quotes in the user string
    }, '');
    const defineUserEssaysString = userEssays.reduce((result: string, userEssay) => {
        return `${result}let ${userEssay.varName} = '${userEssay.value}';`; //TODO we must protect against single quotes in the user string
    }, '');
    const defineUserChecksString = userChecks.reduce((result: string, userCheck) => {
        return `${result}let ${userCheck.varName} = ${userCheck.checked};`;
    }, '');
    const defineUserRadiosString = userRadios.reduce((result: string, userRadio) => {
        return `${result}let ${userRadio.varName} = ${userRadio.checked};`;
    }, '');

    eval(`${defineUserVariablesString}${defineUserInputsString}${defineUserEssaysString}${defineUserChecksString}${defineUserRadiosString}${code}`);

    return answer;
}
