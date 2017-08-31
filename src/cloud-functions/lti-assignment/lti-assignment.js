// const lti = require('ims-lti');
// const JWT = require('jsonwebtoken');

exports.handler = (event, context, callback) => {
    try {
        const body = event.body.split('&').map((x) => x.split('=')).reduce((result, x) => { result[x[0]] = x[1]; return result; }, {});

        const ltiUserId = body.user_id;
        const assignmentId = event.pathParameters.assignmentid;
        const assignmentType = event.pathParameters.assignmenttype;
        const key = body.oauth_consumer_key;
        // const secret = getLTISecret(key);

        console.log('ltiUserId', ltiUserId);
        console.log('assignmentId', assignmentId);
        console.log('assignmentType', assignmentType);
        console.log('key', key);

        return callback(null, {
            statusCode: 200
        });
    }
    catch(error) {
        console.log(JSON.stringify(error, null, 2));
        return callback(null, {
            statusCode: 500
        });
    }
};
