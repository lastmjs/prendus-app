import {User} from './user.js';
import {Subject} from './subject.js';

export interface Discipline {
    readonly id: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly title: string;
    readonly subjects: Subject[];
}
