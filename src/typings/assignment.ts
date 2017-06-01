import {Lesson} from './lesson';
import {User} from './user';

export interface Assignment {
    readonly id: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly title: string;
    readonly lesson: Lesson;
    readonly author: User;
}
