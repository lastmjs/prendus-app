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
        const ltiSessionId = JWT.verify(ltiSessionIdJWT, process.env.PRENDUS_JWT_SECRET).ltiSessionId;
        const outcomeService = await getOutcomeService(api, ltiSessionId);
        await sendGrade(outcomeService, 1);
        await deleteLTISession(api, ltiSessionId);

        return {
            data: {
                success: true
            }
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
        query($ltiSessionId: ID!) {
            LTISession(id: $ltiSessionId) {
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

async function deleteLTISession(api: any, ltiSessionId: string) {
    const data = await api.request(`
        mutation($ltiSessionId: ID!) {
            deleteLTISession(id: $ltiSessionId) {
                id
            }
        }
    `, {
        ltiSessionId
    });

    return data.deleteLTISession.id;
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
