import {User} from './user';
import {Assignment} from './assignment';
import {Discipline} from './discipline';
import {Subject} from './subject';


export interface Course {
    readonly id: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly title: string;
    readonly assignments: Assignment[];
    readonly description: string | null;
    readonly dueDate: Date | null;
    readonly author: User;
    readonly discipline: Discipline;
    readonly subject: Subject;

}
