const JWT = require('jsonwebtoken');
const lti = require('ims-lti');
const fromEvent = require('graphcool-lib').fromEvent;

export default async (event: any) => {
    if (!event.context.graphcool.rootToken) {
        console.log('Please provide a valid root token!')
        return { error: 'assignment-lti-grade not configured correctly.' };
    }

    try {
        const graphcool: any = fromEvent(event);
        const api: any = graphcool.api('simple/v1');
        const ltiSessionIdJWT: string = event.data.ltiSessionIdJWT; //this JWT is signed in the assignment-lti-launch function and merely contains the ltiSessionId, which is the actual graph.cool id of the LTISession stored in the database
        const ltiSessionId: string = JWT.verify(ltiSessionIdJWT, process.env.PRENDUS_JWT_SECRET).ltiSessionId;
        // console.log('ltiSessionId', ltiSessionId);
        const outcomeService: object | null = await getOutcomeService(api, ltiSessionId); //this service allows for the grade to be passed back to the LTI consumer. It has a method that abstracts away that functionality for us
        // console.log('outcomeService', outcomeService);
        if (outcomeService !== null) await sendGrade(outcomeService, 1); //only pass back a grade if the LTI consumer has setup grade passback
        // await deleteLTISession(api, ltiSessionId); //we do not keep LTISessions in the database. The user creates a session when they launch, and the session ends completely when they submit their grade

        return {
            data: {
                success: true
            }
        };
    }
    catch(error) {
        // do not show the full details of the error to the user. The error will show up in the function logs which are only available to us
        console.log(error);
        return {
            error: 'An error occurred'
        };
    }
};

async function getOutcomeService(api: any, ltiSessionId: string): Promise<object | null> {
    const data = await api.request(`
        query($ltiSessionId: ID!) {
            LTISession(id: $ltiSessionId) {
                serializedOutcomeService
            }
        }
    `, {
        ltiSessionId
    });

    //TODO temp solution, remove once the ltiSessionIdJWT can be deleted on the client
    if (data.LTISession === null) {
        console.log('LTISession does not exist, it was most likely deleted...this really should not happen, perhaps the ltiSessionIdJWT was not deleted properly from the client');
        return null;
    }
    //TODO temp solution, remove once the ltiSessionIdJWT can be deleted on the client

    // the outcomeService property will be null if the LTI consumer has not setup grade passback
    if (data.LTISession.serializedOutcomeService.outcomeService === null) {
        return null;
    }
    else {
        const outcomeService = new lti.OutcomeService({
            ...data.LTISession.serializedOutcomeService
        });

        return outcomeService;
    }
}

async function deleteLTISession(api: any, ltiSessionId: string): Promise<string> {
    const data = await api.request(`
        mutation($ltiSessionId: ID!) {
            deleteLTISession(id: $ltiSessionId) {
                id
            }
        }
    `, {
        ltiSessionId
    });

    //TODO temp solution, remove once the ltiSessionIdJWT can be deleted on the client
    if (data.deleteLTISession === null) {
        console.log('LTISession does not exist, it was most likely deleted...this really should not happen, perhaps the ltiSessionIdJWT was not deleted properly from the client');
        return null;
    }
    //TODO temp solution, remove once the ltiSessionIdJWT can be deleted on the client

    return data.deleteLTISession.id;
}

function sendGrade(outcomeService: any, grade: number): Promise<void> {
    return new Promise((resolve, reject) => {
        // console.log('grade', grade);
        // console.log('outcomeService.send_replace_result', outcomeService.send_replace_result);
        outcomeService.send_replace_result(grade, (error: any, result: any) => {
            // console.log('error', error);
            // console.log('result', result);

            if (error) {
                reject(error);
            }
            else {
                resolve();
            }
        });
    });
}
