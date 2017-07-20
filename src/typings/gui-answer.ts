import {AnswerTypes} from './answer-types.js';

export interface GuiAnswer {
		type: AnswerTypes;
		text: string;
		correct?: boolean;
}
