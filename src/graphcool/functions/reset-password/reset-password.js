const JWT = require('jsonwebtoken');
const fromEvent = require('graphcool-lib').fromEvent;

module.exports = function(event) {
    if (!event.context.graphcool.pat) {
        console.log('Please provide a valid root token!')
        return { error: 'Request Password Reset not configured correctly.'}
    }

    const graphcool = fromEvent(event);
    const api = graphcool.api('simple/v1');
    const email = event.data.email;
    const newPassword = event.data.newPassword;
    const jwt = event.data.jwt;

    //TODO look up the user id from the email, get the user current password
    //TODO decrypt the jwt with the current user password
    //TODO make sure the user id matches the looked-up user id from the email passed in
    //TODO update the password
};
