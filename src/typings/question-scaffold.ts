import {QuestionScaffoldAnswer} from './question-scaffold-answer.js';
import {Question} from './question.js';

export interface QuestionScaffold {
  readonly answers: {
    [ questionScaffoldAnswerId: string]: QuestionScaffoldAnswer;
  };
  readonly question: string;
  readonly concept: string;
  readonly explanation: string;
  readonly convertedQuestion: Question;
}
