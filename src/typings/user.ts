import {Course} from './course';
import {Assignment} from './assignment';
import {Quiz} from './quiz';
import {Question} from './question';

export interface User {
    readonly id: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly ownedCourses: Course[];
    readonly assignments: Assignment[];
    readonly quizzes: Quiz[];
    readonly questions: Question[];
    readonly role: string;
    readonly email: string;
}
