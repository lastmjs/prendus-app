import {Course} from './course';
import {Assignment} from './assignment';
import {User} from './user';

export interface Lesson {
    readonly id: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly title: string;
    readonly course: Course;
    readonly assignments: Assignment[];
    readonly author: User;
}
