import {User} from './user';
import {Subject} from './subject';

export interface Discipline {
    readonly id: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly title: string;
    readonly subjects: Subject[];
}
