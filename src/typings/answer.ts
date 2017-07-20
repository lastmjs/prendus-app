import {InputAnswer} from './input-answer.js';
import {CheckOrRadioAnswer} from './check-or-radio-answer.js';

export type Answer = string | InputAnswer | CheckOrRadioAnswer;
