import {User} from './user';
import {Question} from './question';

export interface Quiz {
    readonly id: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly title: string;
    readonly author: User;
    readonly questions: Question[];
}
