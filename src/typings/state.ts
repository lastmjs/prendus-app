import {User} from './user';
import {Notification} from './notification';

export interface State {
    readonly userToken: string | null;
    readonly user: User | null;
    readonly notification: Notification;
    readonly components: {
        readonly [componentId: string]: any;
    };
}
