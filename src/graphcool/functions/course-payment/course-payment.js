const fromEvent = require('graphcool-lib').fromEvent;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = function (event) {
    if (!event.context.graphcool.pat) {
        console.log('Please provide a valid root token!')
        return { error: 'Course Payment not configured correctly.'}
    }

    const graphcool = fromEvent(event);
    const api = graphcool.api('simple/v1');
    const courseId = event.data.courseId;
    const userId = event.data.userId;
    const stripeTokenId = event.data.stripeTokenId;
    const userEmail = event.data.userEmail;
    const purchaseAmount = event.data.amount;
    const idempotency_key = createUUID();

    return getCourseInfo(api, courseId)
            .then((data) => {
                return executeCharge(api, userId, courseId, purchaseAmount, data.courseAmount, stripeTokenId, idempotency_key, userEmail, `Payment for course: ${data.courseTitle}`);
            })
            .then((data) => {
                return {
                    data: {
                        id: data
                    }
                };
            })
            .catch((error) => {
                console.log(JSON.stringify(error));
                return {
                    error: 'An unexpected error occurred'
                };
            });
}

function createUUID() {
    //From persistence.js; Copyright (c) 2010 Zef Hemel <zef@zef.me> * * Permission is hereby granted, free of charge, to any person * obtaining a copy of this software and associated documentation * files (the "Software"), to deal in the Software without * restriction, including without limitation the rights to use, * copy, modify, merge, publish, distribute, sublicense, and/or sell * copies of the Software, and to permit persons to whom the * Software is furnished to do so, subject to the following * conditions: * * The above copyright notice and this permission notice shall be * included in all copies or substantial portions of the Software. * * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR * OTHER DEALINGS IN THE SOFTWARE.
	var s = [];
	var hexDigits = "0123456789ABCDEF";
	for ( var i = 0; i < 32; i++) {
		s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
	}
	s[12] = "4";
	s[16] = hexDigits.substr((s[16] & 0x3) | 0x8, 1);

	var uuid = s.join("");
	return uuid;
}

function getCourseInfo(api, courseId) {
    return api.request(`
          query {
              Course(id: "${courseId}") {
                  title
                  price
              }
          }
    `)
    .then((result) => {
        if (result.error) {
            return Promise.reject(result.error);
        }
        else {
            return {
                courseTitle: result.Course.title,
                courseAmount: result.Course.price
            };
        }
    });
}

function executeCharge(api, userId, courseId, purchaseAmount, courseAmount, stripeTokenId, idempotency_key, userEmail, description) {
    return new Promise((resolve, reject) => {
        if (purchaseAmount !== courseAmount) throw new Error('The course price and the purchase price are not the same. The client could be manipulating the price saved to the Purchase. This must be investigated before any payments are made through Stripe');

        stripe.charges.create({
            amount: purchaseAmount,
            currency: 'usd',
            source: stripeTokenId,
            receipt_email: userEmail,
            description
        }, {
            idempotency_key
        }, (err, charge) => {
          	if (err) {
                reject({
                    error: err
                });
            }

            createPurchase(api, userId, courseId, stripeTokenId, purchaseAmount)
            .then((data) => {
                resolve(data);
            })
            .catch((error) => {
                reject(error);
            });
        });
    });
}

function createPurchase(api, userId, courseId, stripeTokenId, amount) {
    return api.request(`
        mutation {
            createPurchase(
                userId: "${userId}"
                amount: ${amount}
                courseId: "${courseId}"
                stripeTokenId: "${stripeTokenId}"
            ) {
                id
            }
        }
    `)
    .then((result) => {
        if (result.error) {
            return Promise.reject(result.error);
        }
        else {
            return result.createPurchase.id;
        }
    });
}

// function setPurchasePaid(graphCoolEndpoint, prendusCloudFunctionJWT, purchaseId) {
//     return new Promise((resolve, reject) => {
//         fetch(graphCoolEndpoint, {
//             method: 'post',
//             headers: {
//                 'content-type': 'application/json',
//                 'Authorization': `Bearer ${prendusCloudFunctionJWT}`
//             },
//             body: JSON.stringify({
//                 query: `
//                     mutation {
//                         updatePurchase(
//                             id: "${purchaseId}"
//                             isPaid: true
//                         ) {
//                             id
//                         }
//                     }
//                 `
//             })
//         })
//         .then((response) => response.json())
//         .then((responseJSON) => {
//           const data = responseJSON.data;
//           const errors = responseJSON.errors;
//
//           if (errors) {
//               reject(errors);
//           }
//           else {
//               resolve(data);
//           }
//       });
//     });
// }
