const fromEvent = require('graphcool-lib').fromEvent;
const JWT = require('jsonwebtoken');
const lti = require('ims-lti');

let ltiSessions: any = {};

export default async (event: any) => {
    if (!event.context.graphcool.pat) {
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
            url: `/production${event.data.path.replace('{assignmentid}', assignmentId).replace('{assignmenttype}', assignmentType)}`,
            headers: {
                host: 'dwz17de96a.execute-api.us-west-2.amazonaws.com'
            },
            method: event.data.method
        });
        const ltiSessionId = createUUID();
        const ltiSessionIdJWT = JWT.sign({
            ltiSessionId
        }, event.context.graphcool.pat);
        ltiSessions[ltiSessionId] = ltiProvider;
        const ltiUser = await getLTIUser(api, ltiUserId);
        const clientRedirectUrl = `assignment/${assignmentId}/${assignmentType.toLowerCase()}`;

        return {
            data: await generateReturnValues(api, ltiUser, courseId, ltiSessionIdJWT, clientRedirectUrl, assignmentId, assignmentType, ltiUserId, lisPersonContactEmailPrimary, event.context.graphcool.pat)
        };
    }
    catch(error) {
        console.log(error);
        return {
            error: 'An error occurred'
        };
    }
};

async function getCourseId(api: any, assignmentId: string) {
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
            ltiJWT: '',
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

function createUUID() {
    //From persistence.js; Copyright (c) 2010 Zef Hemel <zef@zef.me> * * Permission is hereby granted, free of charge, to any person * obtaining a copy of this software and associated documentation * files (the "Software"), to deal in the Software without * restriction, including without limitation the rights to use, * copy, modify, merge, publish, distribute, sublicense, and/or sell * copies of the Software, and to permit persons to whom the * Software is furnished to do so, subject to the following * conditions: * * The above copyright notice and this permission notice shall be * included in all copies or substantial portions of the Software. * * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR * OTHER DEALINGS IN THE SOFTWARE.
    var s: any = [];
    var hexDigits = "0123456789ABCDEF";
    for ( var i = 0; i < 32; i++) {
        s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
    }
    s[12] = "4";
    s[16] = hexDigits.substr((s[16] & 0x3) | 0x8, 1);

    var uuid = s.join("");
    return uuid;
}
