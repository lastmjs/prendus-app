import {Quiz} from './quiz';
import {User} from './user';

export interface Question {
    readonly id: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly text: string;
    readonly code: string;
    readonly quiz: Quiz;
    readonly author: User;
}
