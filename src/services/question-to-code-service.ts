import {Question} from '../typings/question';
import {GuiQuestion} from '../typings/gui-question';
import {GuiAnswer} from '../typings/gui-answer';

// generates code for a multiple choice question
export const generateMultipleChoice = (guiQuestion: GuiQuestion): { text: string, code: string } => {
	const answers: GuiAnswer[] = guiQuestion.answers;
	// use the first correct answer as the only correct answer
	const firstCorrectIndex: number = answers.findIndex((answer) => answer.correct === true);
	// define text string with question stem and radio buttons
	const text: string 	= `<p>${guiQuestion.stem}</p>`
										+ answers.reduce((prevText, answer, index) => {
		return prevText + `<p>[*]choice${index}[*] ${answer.text}</p>`;
	}, '');
	// define code string with answers
	const code: string = answers.reduce((prevCode, answer, index) => {
		return prevCode + `\nanswer.choice${index} = ${		index == firstCorrectIndex
																										? 'true'
																										: 'false'};`;
	}, '');

	return {
		text,
		code
	};
};

// generates code for a multiple response question
export const generateMultipleResponse = (guiQuestion: GuiQuestion): { text: string, code: string } => {
	const answers: GuiAnswer[] = guiQuestion.answers;
	// define text string with question stem and check boxes
	const text: string 	= `<p>${guiQuestion.stem}</p>`
										+ answers.reduce((prevText, answer, index) => {
		return prevText + `<p>[x]choice${index}[x] ${answer.text}</p>`;
	}, '');
	// define code string with answers
	const code: string = answers.reduce((prevCode, answer, index) => {
		return prevCode + `\nanswer.choice${index} = ${answer.correct
										? 'true'
										: 'false'};`;
	}, '');

	return {
		text,
		code
	};
};

// generates code for a fill in the blank question
export const generateFillInTheBlank = (guiQuestion: GuiQuestion): { text: string, code: string } => {
	const answerText: string = guiQuestion.answers[0].text;
	// define text string with question stem
	const text: string = `<p>${guiQuestion.stem}</p>`;
	// define code string; surround answer with quotes if not a number
	const code: string 	= `answer = ${!isNaN(parseFloat(answerText)) && isFinite(parseFloat(answerText))
											? answerText
											: `'${answerText}'`};`;

	return {
		text,
		code
	};
};
