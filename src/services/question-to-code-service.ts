import {Question} from '../typings/question';
import {GuiQuestion} from '../typings/gui-question';
import {GuiAnswer} from '../typings/gui-answer';

// generates code for a multiple choice question
export const generateMultipleChoice = (guiQuestion: GuiQuestion): { text: string, code: string } => {
  const answers: GuiAnswer[] = guiQuestion.answers;
  // use the first correct answer as the only correct answer
  const firstCorrectIndex: number = answers.findIndex((answer) => answer.correct === true);
  // define text string with question stem and radio buttons
  const text: string  = `<p>${guiQuestion.stem}</p>`
                    + answers.reduce((prevText, answer, index) => {
    return prevText + `<p>[*]${answer.text}[*]</p>`;
  }, '');
  // define code string with answers
  const code: string = answers.reduce((prevCode, answer, index) => {
        if (index === answers.length - 1) {
            return `${prevCode} radio${index + 1} === ${index === firstCorrectIndex ? 'true' : 'false'};`;
        }
        else {
            return prevCode + `radio${index + 1} === ${index === firstCorrectIndex ? 'true' : 'false'} && `;
        }
  }, 'answer = ');

  return {
    text,
    code
  };
};

export const generateEssay = (guiQuestion: GuiQuestion): { text: string, code: string } => {
  const text: string = `<p>${guiQuestion.stem}</p><p>[essay]</p>`;
  const code: string = '';
  return {
    text,
    code
  };
}
