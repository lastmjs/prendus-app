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

export async function loginResolver(parent, args, context, info) {
    const email = args.email;
    const password = args.password;
    const user = await context.db.query.user({
        where: {
            email
        }
    });

    if (!user) {
        throw new Error(`Invalid email or password`);
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
        throw new Error('Invalid email or password');
    }

    return {
        token: jwt.sign({
            userId: user.id
        }, process.env.PRENDUS_JWT_SECRET),
        user
    };
}
