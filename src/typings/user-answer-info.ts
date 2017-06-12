export interface UserAnswerInfo {
    readonly answerInputValue: string;
    readonly userInputsAnswers: {
        [inputName: string]: string
    };
    readonly userCheckboxesAnswers: {
        [checkboxName: string]: boolean
    };
    readonly userRadiosAnswers: {
        [radioName: string]: boolean
    };
}
