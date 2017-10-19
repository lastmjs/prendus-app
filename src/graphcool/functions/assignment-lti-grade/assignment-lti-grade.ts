const JWT = require('jsonwebtoken');
const lti = require('ims-lti');
const fromEvent = require('graphcool-lib').fromEvent;

export default async (event: any) => {
    if (!event.context.graphcool.rootToken) {
        console.log('Please provide a valid root token!')
        return { error: 'assignment-lti-grade not configured correctly.' };
    }

    try {
        const graphcool = fromEvent(event);
        const api = graphcool.api('simple/v1');
        const ltiSessionIdJWT = event.data.ltiSessionIdJWT;
        const ltiSessionId = JWT.verify(ltiSessionIdJWT, event.context.graphcool.rootToken).ltiSessionId;
        const outcomeService = await getOutcomeService(api, ltiSessionId);
        await sendGrade(outcomeService, .5); //TODO change to 1 after testing!!!!!!

        return {
            data: true
        };
    }
    catch(error) {
        console.log(error);
        return {
            error: 'An error occurred'
        };
    }
};

async function getOutcomeService(api: any, ltiSessionId: string) {
    const data = await api.request(`
        query(ltiSessionId: ID!) {
            LTISession(id: ltiSessionId) {
                serializedOutcomeService
            }
        }
    `, {
        ltiSessionId
    });

    const outcomeService = new lti.OutcomeService({
        ...data.LTISession.serializedOutcomeService
    });

    return outcomeService;
}

function sendGrade(outcomeService: any, grade: number) {
    return new Promise((resolve, reject) => {
        outcomeService.send_replace_result(grade, (error: any, result: any) => {
            if (error) {
                reject(error);
            }
            else {
                resolve();
            }
        });
    });
}
