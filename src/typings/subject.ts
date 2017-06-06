import {Discipline} from './discipline';
import {Concept} from './concept';
import {Assignment} from './assignment';
import {User} from './user';

export interface Subject {
    readonly id: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly title: string;
    readonly discipline: Discipline;
    readonly concepts: Concept[];
}
