import {getUserId} from '../services/utilities';

export async function authenticatedDirectiveResolver(next, source, args, context) {
    if (getUserId(context)) {
        return await next();
    }
    else {
        throw new Error('Not authenticated');
    }
}

export async function privateDirectiveResolver(next, source, args, context) {
    throw new Error('Private');
}

export async function userOwnsDirectiveResolver(next, source, args, context) {
    if (source.id === await getUserId(context)) {
        return await next();
    }
    else {
        throw new Error('Not authorized');
    }
}
