import {State} from './state.js';
import {Action} from './actions.js';

export type Reducer = (state: State, action: Action) => State;
