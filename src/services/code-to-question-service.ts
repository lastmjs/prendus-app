import {Question} from '../typings/question';
import {GuiQuestion} from '../typings/gui-question';
import {GuiAnswer} from '../typings/gui-answer';
import {AnswerTypes} from '../typings/answer-types';

// detect what kind of question the code contains and generate GUI data structure
export const generateGuiData = (question: { text: string, code: string }): GuiQuestion => {
	// for now assume the entire question is of a single type
	if(question.text.indexOf('[*]') > 0) return generateMultipleGeneral(question, false);
	if(question.text.indexOf('[x]') > 0) return generateMultipleGeneral(question, true);
	else return generateFillInTheBlank(question);
}

// generates the GUI for a multiple choice or multiple response question
export const generateMultipleGeneral = (question: { text: string, code: string }, selectMultiple: boolean): GuiQuestion => {
	// helper function
	const isThisCorrect = (piece: string): boolean => {
		// find string in array of code; check if next index is true
		const index: number = codePieces.indexOf(piece);
		return index >= 0 && codePieces[index + 1] === 'true';
	}

	// remove whitespace
	const text: string = question.text;
	const code: string = question.code.replace(/\s/g, '');
	// assume stem is from start of text to first radio button or checkbox
	const stemRegex: RegExp = selectMultiple ? /<p>\s*\[x\]/ : /<p>\s*\[\*\]/;
	const stem: string = text.substring(0, text.search(stemRegex)).replace(/<p>|<\/p>|<br>/g, '');
	const splitTextRegex: RegExp = selectMultiple ? /\[x\]|<p>|<\/p>/ : /\[\*\]|<p>|<\/p>/;
	// create and groom an array of text pieces
	const textPieces: string[] = text
		// split text into arrays
		.split(splitTextRegex)
		// filter leftovers with spaces and line breaks
		.filter((piece) => piece.replace(/\s|<br>/g, '') !== '')
		// throw away stem
		.slice(1)
		// trim whitespace at beginning and end
		.map((piece) => piece.trim());
	// create and groom array of code pieces
	const codePieces: string[] = code
		// split and get rid of code syntax
		.split(/;|\.|answer|=/)
		// filter out leftoever pieces
		.filter((piece) => {
			return piece !== '';
		});
	// extract and groom answers
	const answers: GuiAnswer[] = textPieces
		// use even indices to match text and code
		.map((piece, index, pieces) => {
			if(index % 2 === 0) return {
					type: selectMultiple ? AnswerTypes.MultipleResponse : AnswerTypes.MultipleChoice,
					text: pieces[index + 1] || '',
					correct: isThisCorrect(piece)
				};
		})
		// filter out odd pieces that have no information
		.filter((piece) => piece !== undefined);

	return {
		stem: stem,
		answers: answers
	};
};

// generates the GUI for a fill in the blank question
export const generateFillInTheBlank = (question: { text: string, code: string }): GuiQuestion => {
	// get stem from text
	const stem: string = question.text.replace(/<p>|<\/p>|<br>/g, '');
	// get blank from code
	const answerText: string = question.code.replace(/'|answer|\.|;|=/g, '').trim();


	return {
		stem: stem,
		answers: [{
				type: AnswerTypes.FillInTheBlank,
				text: answerText,
				correct: true
			}
		]
	};
};
