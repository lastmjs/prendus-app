import {UserAnswerInfo} from '../../../node_modules/prendus-services/typings/user-answer-info';
import {ReturnAnswerInfo} from '../typings/return-answer-info';
import {Answer} from '../../../node_modules/prendus-services/typings/answer';

const checkAnswer = (userAnswerInfo: UserAnswerInfo, answer: Answer): ReturnAnswerInfo => {
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
                //API.answerAttempt(this.problemId, true, this.problemText, answer, defaultAnswerInputValue);
            }
            else {
                return 'Incorrect';
                //API.answerAttempt(this.problemId, false, this.problemText, answer, defaultAnswerInputValue);
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
                //API.answerAttempt(this.problemId, true, this.problemText, answer, userAnswers);
            }
            else {
                return 'Incorrect';
                //API.answerAttempt(this.problemId, false, this.problemText, answer, userAnswers);
            }
        }
    }
    catch(error) {
        return 'No valid answer was provided for this question';
    }
};

export const CheckAnswerService = {
    checkAnswer
};
