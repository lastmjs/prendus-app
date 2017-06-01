import {User} from './user';
import {Lesson} from './lesson';

export interface Course {
    readonly id: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly title: string;
    readonly lessons: Lesson[];
    readonly description: string | null;
    readonly dueDate: Date | null;
    readonly author: User;
}
