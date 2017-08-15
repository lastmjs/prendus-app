import {Course} from './course';
import {User} from './user';
import {Question} from './question';
import {AssignmentType} from './assignment-type'

export interface Assignment {
    readonly id: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly title: string;
    readonly course: Course;
    readonly author: User;
    readonly questions: Question[]
    readonly create: number | undefined;
    readonly review: number | undefined;
    readonly take: number;
}
