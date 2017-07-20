import {Answer} from './answer.js';
import {User} from './user.js';

export interface BuiltQuestion {
    readonly transformedText: string;
    readonly text: string;
    readonly code: string;
    readonly answer: Answer;
    readonly uuid: string;
    readonly userInputs: string[];
    readonly userCheckboxes: string[];
    readonly userRadios: string[];
    readonly author: User;
}
