import {AnswerTypes} from './answer-types';

export interface GuiAnswer {
		type: AnswerTypes;
		text: string;
		correct?: boolean;
}
