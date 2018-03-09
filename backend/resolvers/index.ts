import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

export async function signupResolver(parent, args, context, info) {
    const encryptedPassword = await bcrypt.hash(args.password, 10);
    const user = await context.db.mutation.createUser({
        data: {
            ...args,
            password: encryptedPassword
        }
    });

    return {
        token: jwt.sign({
            userId: user.id
        }, process.env.PRENDUS_JWT_SECRET),
        user
    };
}
