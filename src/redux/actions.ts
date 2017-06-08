import {GQLQuery} from '../services/graphql-service';
import {SetPropertyAction, DefaultAction} from '../typings/actions';
import {State} from '../typings/state';

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

export function removeUser(): SetPropertyAction {
    return {
        type: 'SET_PROPERTY',
        key: 'user',
        value: null
    };
}

export function removeUserToken(): SetPropertyAction {
    window.localStorage.setItem('userToken', '');
    return {
        type: 'SET_PROPERTY',
        key: 'userToken',
        value: null
    };
}

export async function getAndSetUser(): Promise<SetPropertyAction | DefaultAction> {
    const originalUserToken = window.localStorage.getItem('userToken');

    if (originalUserToken) {
        const data = await GQLQuery(`
            query {
                user {
                    id
                    email
                }
            }
        `, originalUserToken, (key: string, value: any) => {}, (error: any) => {
            throw error;
        });

        // The user token might be set to null while the request is off...if it is, we do not want to set the user because we are expecting the user to stay null
        const currentUserToken = window.localStorage.getItem('userToken');
        if (currentUserToken) {
            return {
                type: 'SET_PROPERTY',
                key: 'user',
                value: data.user
            };
        }
    }

    return {
        type: 'DEFAULT_ACTION'
    };
}

export function persistUserToken(userToken: string): SetPropertyAction {
    window.localStorage.setItem('userToken', userToken);
    return {
        type: 'SET_PROPERTY',
        key: 'userToken',
        value: userToken
    };
}
