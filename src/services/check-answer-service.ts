import {UserAnswerInfo} from '../typings/user-answer-info';
import {ReturnAnswerInfo} from '../typings/return-answer-info';
import {Answer} from '../typings/answer';

export function checkAnswer(userAnswerInfo: UserAnswerInfo, answer: Answer): ReturnAnswerInfo {
    try {
        const answerInputValue = userAnswerInfo.answerInputValue;
        const userInputsAnswers = userAnswerInfo.userInputsAnswers;
        const userCheckboxesAnswers = userAnswerInfo.userCheckboxesAnswers;
        const userRadiosAnswers = userAnswerInfo.userRadiosAnswers;

        const userInputVarNames = Object.keys(userInputsAnswers || {});
        const userCheckboxVarNames = Object.keys(userCheckboxesAnswers || {});
        const userRadioVarNames = Object.keys(userRadiosAnswers || {});

        if (typeof answer !== 'object') {

            if (answer.toString().toLowerCase() === answerInputValue.toLowerCase()) {
                return 'Correct';
            }
            else {
                return 'Incorrect';
            }
        }
        else {

            const inputsCorrect = userInputVarNames.reduce((prev: boolean, curr: string) => {
                const userAnswer: string = userInputsAnswers[curr];

                if (answer[curr].toString().toLowerCase() === userAnswer.toLowerCase()) {
                    return prev;
                }
                else {
                    return false;
                }
            }, true);

            const checkboxesCorrect = userCheckboxVarNames.reduce((prev: boolean, curr: string) => {
                const userAnswer: boolean = userCheckboxesAnswers[curr];

                if (answer[curr] === userAnswer) {
                    return prev;
                }
                else {
                    return false;
                }
            }, true);

            const radiosCorrect = userRadioVarNames.reduce((prev: boolean, curr: string) => {
                const userAnswer: boolean = userRadiosAnswers[curr];

                if (answer[curr] === userAnswer) {
                    return prev;
                }
                else {
                    return false;
                }
            }, true);

            if (inputsCorrect && checkboxesCorrect && radiosCorrect) {
                return 'Correct';
            }
            else {
                return 'Incorrect';
            }
        }
    }
    catch(error) {
        return 'No valid answer was provided for this question';
    }
}
