const fromEvent = require('graphcool-lib').fromEvent;
const JWT = require('jsonwebtoken');
const lti = require('ims-lti');

let ltiSessions: any = {};

module.exports = async (event: any) => {
    if (!event.context.graphcool.pat) {
        console.log('Please provide a valid root token!')
        return { error: 'assignment-lti-launch not configured correctly.'}
    }

    try {
        const graphcool = fromEvent(event);
        const api = graphcool.api('simple/v1');
        const ltiUserId = event.data.ltiUserId;
        const assignmentId = event.data.assignmentId;
        const courseId = await getCourseId(api, assignmentId);
        const assignmentType = event.data.assignmentType;
        const lisPersonContactEmailPrimary = event.data.lisPersonContactEmailPrimary;
        const key = event.data.oauthConsumerKey;
        const secret = getLTISecret(key);
        const requestBody = event.data.requestBody;
        const ltiProvider = await validateLTIRequest(key, secret, {
            body: requestBody
        });
        const ltiSessionId = createUUID();
        const ltiSessionIdJWT = JWT.sign({
            ltiSessionId
        }, event.context.graphcoo.pat);
        ltiSessions[ltiSessionId] = ltiProvider;
        const ltiUser = await getLTIUser(api, ltiUserId);
        const clientRedirectUrl = `assignment/${assignmentId}/${assignmentType.toLowerCase()}`;

        return await generateReturnValues(api, ltiUser, courseId, ltiSessionIdJWT, clientRedirectUrl, assignmentId, assignmentType, ltiUserId, lisPersonContactEmailPrimary, event.context.graphcool.pat);
    }
    catch(error) {
        console.log(error);
        return {
            error: 'An error occurred'
        };
    }
};

async function generateReturnValues(api: any, ltiUser: any, courseId: string, ltiSessionIdJWT: string, clientRedirectUrl: string, assignmentId: string, assignmentType: string, ltiUserId: string, lisPersonContactEmailPrimary: string, pat: string) {
    if (ltiUser) {
        await enrollUserOnCourse(api, ltiUser.user.id, courseId);
        await payForCourseIfFree(api, ltiUser.user.id, courseId);

        return {
            ltiSessionIdJWT,
            clientRedirectUrl,
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
        }, pat);

        return {
            ltiJWT,
            ltiSessionIdJWT,
            clientRedirectUrl,
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
