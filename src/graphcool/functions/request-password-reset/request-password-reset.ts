const JWT = require('jsonwebtoken');
const fromEvent = require('graphcool-lib').fromEvent;
const mailgun = require('mailgun-js')({
    apiKey: process.env.MAILGUN_API_KEY,
    domain: 'prendus.com'
});

module.exports = function(event) {
    if (!event.context.graphcool.pat) {
        console.log('Please provide a valid root token!')
        return { error: 'request-password-reset not configured correctly.'}
    }

    const graphcool = fromEvent(event);
    const api = graphcool.api('simple/v1');
    const email = event.data.email;

    return getUserInfo(api, email)
    .then((userInfo) => {
        const jwt = JWT.sign({
            userId: userInfo.id
        }, userInfo.password, {
            expiresIn: '1hr'
        });

        const data = {
            from: 'Prendus Support <support@prendus.com>',
            to: email,
            subject: 'Password Reset',
            text: `Click the link to reset your password: https://www.prendus.com/password-reset/${jwt}`
        };

        return new Promise((resolve, reject) => {
            mailgun.messages().send(data, (error, body) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(email);
                }
            });
        })
        .then((email) => {
            return {
                data: {
                    email
                }
            };
        })
        .catch((error) => {
            return {
                error
            };
        });
    });
};

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
            return Promise.reject('No user was found');
        }
        else {
            return {
                id: data.allUsers[0].id,
                password: data.allUsers[0].password
            };
        }
    });
}
