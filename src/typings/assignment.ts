import {Course} from './course';
import {User} from './user';
import {AssignmentType} from './assignment-type'

export interface Assignment {
    readonly id: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly title: string;
    readonly course: Course;
    readonly author: User;
    readonly AssignmentType: AssignmentType;
}
