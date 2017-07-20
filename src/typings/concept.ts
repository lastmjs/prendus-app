import {Subject} from './subject.js';
import {User} from './user.js';

export interface Concept {
    readonly id: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly title: string;
    readonly subject: Subject;
}
