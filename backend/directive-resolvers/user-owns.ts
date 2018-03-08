import {getUserId} from '../utilities';

export async function userOwns(next, source, args, context) {
    console.log('next', await next());
    console.log('source', source);
    console.log('args', args);
    console.log('context', context);

    console.log(context.request.body);

    // const {id} = context.request.body.variables;
    //
    // console.log('id', id);

    throw new Error('Not authorized');
}
