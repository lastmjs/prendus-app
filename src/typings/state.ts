import {User} from './user';

export interface State {
    readonly userToken: string | null;
    readonly user: User | null;
    readonly components: {
        readonly [componentId: string]: any;
    };
}
