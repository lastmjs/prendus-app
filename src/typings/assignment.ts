import {Course} from './course.js';
import {User} from './user.js';
import {AssignmentType} from './assignment-type.js'

export interface Assignment {
    readonly id: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly title: string;
    readonly course: Course;
    readonly author: User;
}
