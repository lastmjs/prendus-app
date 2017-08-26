import {Question} from '../typings/question';
import {GuiQuestion} from '../typings/gui-question';
import {GuiAnswer} from '../typings/gui-answer';
import {DEFAULT_EVALUATION_RUBRIC} from '../services/constants-service';

// generates code for a multiple choice question
export const generateMultipleChoice = (guiQuestion: GuiQuestion): { text: string, code: string } => {
  const answers: GuiAnswer[] = guiQuestion.answers;
  // use the first correct answer as the only correct answer
  const firstCorrectIndex: number = answers.findIndex((answer) => answer.correct === true);
  const { questionPictureUrl } = guiQuestion;
  // define text string with question stem and radio buttons
  const text: string  = `<p>${guiQuestion.stem}</p>`
    + (questionPictureUrl ? `<p><img src="${questionPictureUrl}"/></p>` : '')
    + answers.reduce((prevText, answer, index) => {
      return prevText + `<p style="display: flex; align-items: start;">[*]${answer.text}`
        + (answer.pictureUrl ? `<span>&nbsp;<img src="${answer.pictureUrl}"/></span>` : '')
        + `[*]</p>`;
    }, '');
  // define code string with answers
  const code: string = "evaluationRubric = '" + JSON.stringify(DEFAULT_EVALUATION_RUBRIC) + "'; "
    + answers.reduce((prevCode, answer, index) => {
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
  const { stem, gradingRubric, evaluationRubric, imageUrls } = guiQuestion;
  const text: string = `<p>${stem}</p>`
    + (imageUrls.length ? `<p><img src="${imageUrls[0]}"/></p>` : '')
    + `<p>[essay]</p>`;
  const code: string = `
    gradingRubric = '${JSON.stringify(gradingRubric)}';
    evaluationRubric = '${JSON.stringify(evaluationRubric)}';
  `;
  return {
    text,
    code
  };
}
