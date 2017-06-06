import {Subject} from './subject';
import {User} from './user';

export interface Concept {
    readonly id: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly title: string;
    readonly subject: Subject;
}
