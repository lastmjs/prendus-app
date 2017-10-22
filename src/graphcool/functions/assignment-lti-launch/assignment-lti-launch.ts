const fromEvent = require('graphcool-lib').fromEvent;
const JWT = require('jsonwebtoken');
const lti = require('ims-lti');

interface OutcomeServiceJSON {
    cert_authority: string;
    consumer_key: string;
    consumer_secret: string;
    language: string;
    result_data_types: string;
    service_url: string;
    service_url_oauth: string;
    service_url_parts: string;
    signer: null;
    source_did: string;
    send_replace_result: null;
    supports_result_data: null;
    send_read_result: null;
    send_delete_result: null;
    send_replace_result_with_text: null;
    send_replace_result_with_url: null;
}

interface NullOutcomeServiceJSON {
    outcomeService: null;
}

export default async (event: any) => {
    if (!event.context.graphcool.rootToken) {
        console.log('Please provide a valid root token!')
        return { error: 'assignment-lti-launch not configured correctly.' };
    }

    try {
        const body = parseUrlEncodedBody(event.data.requestBody);
        const graphcool = fromEvent(event);
        const api = graphcool.api('simple/v1');
        const ltiUserId = body.user_id;
        const assignmentId = event.data.assignmentId;
        const courseId = await getCourseId(api, assignmentId);
        const assignmentType = event.data.assignmentType;
        const lisPersonContactEmailPrimary = body.lis_person_contact_email_primary;
        const key = body.oauth_consumer_key;
        const secret = getLTISecret(key);
        const ltiProvider = await validateLTIRequest(key, secret, {
            body,
            protocol: 'https',
            url: `/lti${event.data.path.replace('{assignmentid}', assignmentId).replace('{assignmenttype}', assignmentType)}`,
            headers: {
                host: 'api.prendus.com'
            },
            method: event.data.method
        });
        const ltiSessionId = await createLTISession(api, ltiProvider, ltiUserId);
        const ltiSessionIdJWT = JWT.sign({
            ltiSessionId
        }, process.env.PRENDUS_JWT_SECRET);
        const ltiSessionIdJWTCookie = `ltiSessionIdJWT=${ltiSessionIdJWT}; Domain=${process.env.PRENDUS_CLIENT_DOMAIN}; Path=/`;
        const ltiUser = await getLTIUser(api, ltiUserId);
        const clientRedirectUrl = `assignment/${assignmentId}/${assignmentType.toLowerCase()}`;
        const clientRedirectUrlCookie = `redirectUrl=${clientRedirectUrl}; Domain=${process.env.PRENDUS_CLIENT_DOMAIN}; Path=/`;

        return {
            data: await generateReturnValues(api, ltiUser, courseId, ltiSessionIdJWTCookie, clientRedirectUrlCookie, assignmentId, assignmentType, ltiUserId, lisPersonContactEmailPrimary, process.env.PRENDUS_JWT_SECRET)
        };
    }
    catch(error) {
        console.log(error);
        return {
            error: 'An error occurred'
        };
    }
};

async function createLTISession(api: any, ltiProvider: any, ltiUserId: string): Promise<string> {
    console.log('ltiProvider.outcome_service', ltiProvider.outcome_service);
    const outcomeServiceJSON = jsonifyOutcomeService(ltiProvider.outcome_service);
    const data = await api.request(`
        mutation($ltiUserId: String!, $serializedOutcomeService: Json!) {
            createLTISession(
                ltiUserId: $ltiUserId
                serializedOutcomeService: $serializedOutcomeService
            ) {
                id
            }
        }
    `, {
        ltiUserId,
        serializedOutcomeService: outcomeServiceJSON
    });

    return data.createLTISession.id;
}

function jsonifyOutcomeService(outcomeService: any): OutcomeServiceJSON | NullOutcomeServiceJSON {
    if (!outcomeService) {
        return {
            outcomeService: null
        };
    }
    else {
        return {
            cert_authority: outcomeService.cert_authority,
            consumer_key: outcomeService.consumer_key,
            consumer_secret: outcomeService.consumer_secret,
            language: outcomeService.language,
            result_data_types: outcomeService.result_data_types,
            service_url: outcomeService.service_url,
            service_url_oauth: outcomeService.service_url_oauth,
            service_url_parts: outcomeService.service_url_parts,
            signer: null,
            source_did: outcomeService.source_did,
            send_replace_result: null,
            supports_result_data: null,
            send_read_result: null,
            send_delete_result: null,
            send_replace_result_with_text: null,
            send_replace_result_with_url: null
        };
    }
}

async function getCourseId(api: any, assignmentId: string): Promise<string> {
    const data = await api.request(`
      query {
          Assignment(
              id: "${assignmentId}"
          ) {
              course {
                  id
              }
          }
      }
    `);

    return data.Assignment.course.id;
}

function parseUrlEncodedBody(rawBody: string): any {
    return rawBody
            .split('&')
            .map(x => x.split('='))
            .reduce((result, x) => {
                const key = decodeURIComponent(x[0]);
                const value = decodeURIComponent(x[1].replace(/\+/g, '%20'));
                return Object.assign({}, result, {
                    [key]: value
                });
            }, {});
}

async function generateReturnValues(api: any, ltiUser: any, courseId: string, ltiSessionIdJWTCookie: string, clientRedirectUrlCookie: string, assignmentId: string, assignmentType: string, ltiUserId: string, lisPersonContactEmailPrimary: string, rootToken: string) {
    if (ltiUser) {
        await enrollUserOnCourse(api, ltiUser.user.id, courseId);
        await payForCourseIfFree(api, ltiUser.user.id, courseId);

        //TODO we are only adding the cookie syntax in here until a more elegant solution is provided by AWS API Gateway or graph.cool (we'll be dropping AWS API Gateway as soon as graph.cool supports setting headers and gives full access to the response body)
        return {
            ltiSessionIdJWTCookie,
            clientRedirectUrlCookie,
            serverRedirectUrl: `${process.env.PRENDUS_CLIENT_ORIGIN}/assignment/${assignmentId}/${assignmentType.toLowerCase()}`
        };
    }
    else {
        // if the user does not exist yet in our system, we'll need to redirect them to the signup page and provide the url to go back to once they are signed up
        // They also need the ltiJWT to have the cloud function connect their newly created User to a newly created LTIUser, and to use the same cloud function to authorize the User for the Assignment

        const ltiJWT = JWT.sign({
            assignmentId,
            ltiUserId,
            lisPersonContactEmailPrimary
        }, rootToken);

        //TODO we are only adding the cookie syntax in here until a more elegant solution is provided by AWS API Gateway or graph.cool (we'll be dropping AWS API Gateway as soon as graph.cool supports setting headers and gives full access to the response body)
        return {
            ltiJWTCookie: `ltiJWT=${ltiJWT}; Domain=${process.env.PRENDUS_CLIENT_DOMAIN}; Path=/`,
            ltiSessionIdJWTCookie,
            clientRedirectUrlCookie,
            serverRedirectUrl: `${process.env.PRENDUS_CLIENT_ORIGIN}/authenticate`
        };
    }
}

function getLTISecret(key: string): string {
    //TODO eventually this will retrieve from the databases the LTI secret associated with the assignment/course
    return process.env.PRENDUS_LTI_SECRET;
}

async function validateLTIRequest(key: string, secret: string, req: any) {
    return new Promise((resolve, reject) => {
        const ltiProvider = new lti.Provider(key, secret);
        ltiProvider.valid_request(req, (error: any, isValid: boolean) => {
            if (isValid) {
                resolve(ltiProvider);
            }
            else if (error) {
                reject(error);
            }
            else {
                reject('LTI request not valid');
            }
        });
    });
}

async function getLTIUser(api: any, ltiUserId: string) {
    const data = await api.request(`
        query {
            ltiUser: LTIUser(ltiUserId: "${ltiUserId}") {
                user {
                    id
                }
            }
        }
    `);

    return data.ltiUser;
}

async function payForCourseIfFree(api: any, userId: string, courseId: string) {
    const data = await api.request(`
      query {
          Course(
              id: "${courseId}"
          ) {
              price
          }
      }
    `);

    const price = data.Course.price;
    return price === 0 ? await payForCourseIfNoPurchaseExists(api, userId, courseId) : -1;
}

async function payForCourseIfNoPurchaseExists(api: any, userId: string, courseId: string) {
    const data = await api.request(`
        query {
            allPurchases(filter: {
                user: {
                    id: "${userId}"
                }
                course: {
                    id: "${courseId}"
                }
            }) {
                id
            }
        }
    `);

    return data.allPurchases.length === 0 ? payForCourse(api, userId, courseId) : -1;
}

async function payForCourse(api: any, userId: string, courseId: string) {
    const data = await api.request(`
        mutation {
            createPurchase(
                   userId: "${userId}"
                   amount: 0
                   courseId: "${courseId}"
                   stripeTokenId: "there is no stripeTokenId for a free course"
            ) {
                course {
                    price
                }
            }
        }
    `);

    return data.createPurchase.course.price;
}

async function enrollUserOnCourse(api: any, userId: string, courseId: string) {
    const data = await api.request(`
        mutation {
            addToStudentsAndCourses(
                enrolledCoursesCourseId: "${courseId}"
                enrolledStudentsUserId: "${userId}"
            ) {
                enrolledStudentsUser {
                    id
                }
                enrolledCoursesCourse {
                    id
                }
            }
        }
    `);

    return data.addToStudentsAndCourses.enrolledStudentsUser.id;
}
