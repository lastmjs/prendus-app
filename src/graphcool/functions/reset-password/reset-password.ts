const JWT = require('jsonwebtoken');
const fromEvent = require('graphcool-lib').fromEvent;
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;

export default async (event) => {
    if (!event.context.graphcool.pat) {
        console.log('Please provide a valid root token!')
        return { error: 'reset-password not configured correctly.'}
    }

    const graphcool = fromEvent(event);
    const api = graphcool.api('simple/v1');
    const email = event.data.email;
    const newPassword = event.data.newPassword;
    const jwt = event.data.jwt;

    return getUserInfo(api, email)
            .then((userInfo) => {
                const payload = JWT.verify(jwt, userInfo.password);
                const userId = payload.userId;

                if (userId !== userInfo.id) {
                    console.log('The userId of the email passed in and the userId from the JWT did not match');
                    return Promise.reject('Error');
                }

                return resetPassword(api, userId, newPassword);
            })
            .then((userId) => {
                return {
                    data: {
                        id: userId
                    }
                };
            })
            .catch((error) => {
                return {
                    error
                };
            });
}

function getUserInfo(api, email) {
    return api.request(`
        query {
            allUsers(filter: {
                email: "${email}"
            }) {
                id
                password
            }
        }
    `)
    .then((data) => {
        if (data.allUsers.error) {
            return Promise.reject(data.allUsers.error);
        }
        else if (data.allUsers.length === 0) {
            console.log('No user was found');
            return Promise.reject('Error');
        }
        else {
            return {
                id: data.allUsers[0].id,
                password: data.allUsers[0].password
            };
        }
    });
}

function resetPassword(api, userId, password) {
    return bcrypt.hash(password, SALT_ROUNDS)
            .then((hashedPassword) => {
                return api.request(`
                    mutation {
                        updateUser(
                            id: "${userId}"
                            password: "${hashedPassword}"
                        ) {
                            id
                        }
                    }
                `)
                .then((data) => {
                    if (data.error) {
                        return Promise.reject(data.error);
                    }
                    else {
                        return data.updateUser.id;
                    }
                });
            });
}
