import {Discipline} from './discipline.js';
import {Concept} from './concept.js';
import {Assignment} from './assignment.js';
import {User} from './user.js';

export interface Subject {
    readonly id: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly title: string;
    readonly discipline: Discipline;
    readonly concepts: Concept[];
}
