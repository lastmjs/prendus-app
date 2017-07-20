import {Course} from './course.js';
import {Assignment} from './assignment.js';
import {Quiz} from './quiz.js';
import {Question} from './question.js';

export interface User {
    readonly id: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly ownedCourses: Course[];
    readonly assignments: Assignment[];
    readonly quizzes: Quiz[];
    readonly questions: Question[];
}
