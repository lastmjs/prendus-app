import {InitialState} from './initial-state';

export const RootReducer = (state=InitialState, action) => {
    switch(action.type) {
        case 'SET_PROPERTY': {
            return {
                ...state,
                [action.key]: action.value
            };
        }
        default: {
            return state;
        }
    }
};
