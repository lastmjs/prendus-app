import {getUserId} from '../utilities';

export async function userOwns(next, source, args, context) {
    if (source.id === await getUserId(context)) {
        return await next();
    }
    else {
        throw new Error('Not authorized');
    }
}
