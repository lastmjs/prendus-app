import {User} from './user.js';
import {Question} from './question.js';

export interface Quiz {
    readonly id: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly title: string;
    readonly author: User;
    readonly questions: Question[];
}
