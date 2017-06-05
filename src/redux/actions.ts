import {GQLQuery} from '../services/graphql-service';
import {SetPropertyAction, DefaultAction} from '../typings/actions';

export function checkForUserToken(): SetPropertyAction | DefaultAction {
    const userToken = window.localStorage.getItem('userToken');

    if (userToken) {
        return {
            type: 'SET_PROPERTY',
            key: 'userToken',
            value: userToken
        };
    }
    else {
        return {
            type: 'DEFAULT_ACTION'
        };
    }
}

export async function getAndSetUser(userToken): Promise<SetPropertyAction | DefaultAction> {
    if (userToken) {
        const data = await GQLQuery(`
            query {
                user {
                    id
                    email
                }
            }
        `, userToken, (key, value) => {});

        return {
            type: 'SET_PROPERTY',
            key: 'user',
            value: data.user
        };
    }
    else {
        return {
            type: 'DEFAULT_ACTION'
        };
    }
}

export function persistUserToken(userToken): SetPropertyAction {
    window.localStorage.setItem('userToken', userToken);
    return {
        type: 'SET_PROPERTY',
        key: 'userToken',
        value: userToken
    };
}
