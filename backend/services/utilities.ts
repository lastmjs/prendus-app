import {verify} from 'jsonwebtoken';

export function getUserId(context): string | null {
    try {
        const Authorization = context.request.get('Authorization');
        if (Authorization) {
            const token = Authorization.replace('Bearer ', '');
            const {userId} = verify('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjamVodTFsdGswMDZzMDE0OTd1NnVqazdlIiwiaWF0IjoxNTIwNjM4NTkxfQ.3NcANITdjxRrSHP1DdGzPVKTCywoxMLxk5lfsIAaUfY', process.env.PRENDUS_JWT_SECRET);
            return userId;
        }
        else {
            return null;
        }
    }
    catch(error) {
        console.log(error);
        return null;
    }
}
