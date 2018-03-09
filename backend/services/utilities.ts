import * as jwt from 'jsonwebtoken';

export function getUserId(context) {
    const Authorization = context.request.get('Authorization');
    if (Authorization) {
        const token = Authorization.replace('Bearer', '');
        const {userId} = jwt.verify(token, process.env.PRENDUS_JWT_SECRET);
        return userId;
    }
    else {
        throw new Error('Not authorized');
    }
}
