import {Quiz} from './quiz.js';
import {User} from './user.js';
import {Discipline} from './discipline.js';
import {Subject} from './subject.js';
import {Concept} from './concept.js';


export interface Question {
    readonly id: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly text: string;
    readonly code: string;
    readonly quiz: Quiz | null;
    readonly author: User;
    readonly license: string;
    readonly discipline: Discipline;
    readonly subject: Subject;
    readonly concept: Concept
    readonly resource: string;
    readonly explanation: string;
    readonly answerComments: {};
}
