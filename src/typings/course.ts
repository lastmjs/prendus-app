import {User} from './user.js';
import {Assignment} from './assignment.js';

export interface Course {
    readonly id: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly title: string;
    readonly assignments: Assignment[];
    readonly description: string | null;
    readonly dueDate: Date | null;
    readonly author: User;
}
