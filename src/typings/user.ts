import {Course} from './course';
import {Lesson} from './lesson';
import {Assignment} from './assignment';
import {Quiz} from './quiz';
import {Question} from './question';

export interface User {
    readonly id: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly courses: Course[];
    readonly lessons: Lesson[];
    readonly assignments: Assignment[];
    readonly quizzes: Quiz[];
    readonly questions: Question[];
}
