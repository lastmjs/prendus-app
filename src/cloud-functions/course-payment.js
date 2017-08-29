const fetch = require('isomorphic-fetch');
const graphCoolEndpoint = 'https://api.graph.cool/simple/v1/cj36de9q4dem00134bhkwm44r';
const prendusCloudFunctionJWT = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE0OTY4NjI4ODUsImNsaWVudElkIjoiY2oyd2lmdnZmM29raTAxNTRtZnN0c2lscCIsInByb2plY3RJZCI6ImNqMzZkZTlxNGRlbTAwMTM0Ymhrd200NHIiLCJwZXJtYW5lbnRBdXRoVG9rZW5JZCI6ImNqM25kaWlidGZmcTUwMTczdnJma2p6cTAifQ.rsV46JtH7yOxB-kz17UDs33XIfHpBT72M_OSLlQq1LA';

module.exports = function (event) {
    return new Promise(function(resolve, reject) {
        const purchaseId = event.data.Purchase.node.id;
        const purchaseIsPaid = event.data.Purchase.node.isPaid;
        const purchaseAmount = event.data.Purchase.node.amount;
        const courseAmount = event.data.Purchase.node.course.price;
        const stripeTokenId = event.data.Purchase.node.stripeTokenId;
        const idempotency_key = createUUID();
        if (courseAmount !== purchaseAmount) throw new Error('The course price and the purchase price are not the same. The client could be manipulating the price saved to the Purchase. This must be investigated before any payments are made through Stripe');
        if (purchaseIsPaid === true) throw new Error('The isPaid property on the new Purchase is set to true. The client could be manipulating the Purchase object. This must be investigated before any payments are made through Stripe');
        executeCharge(courseAmount, stripeTokenId, idempotency_key, graphCoolEndpoint, prendusCloudFunctionJWT, purchaseId)
        .then((data) => {
            resolve({
                data
            });
        })
        .catch((error) => {
            reject({
                error
            });
        });
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

function executeCharge(amount, stripeTokenId, idempotency_key, graphCoolEndpoint, prendusCloudFunctionJWT, purchaseId) {
    return new Promise((resolve, reject) => {
        stripe.charges.create({
            amount,
            currency: 'usd',
            source: stripeTokenId
        }, {
            idempotency_key
        }, (err, charge) => {
          	if (err) {
                reject({
                    error: err
                });
            }

            setPurchasePaid(graphCoolEndpoint, prendusCloudFunctionJWT, purchaseId)
            .then((data) => {
                resolve(data);
            })
            .catch((error) => {
                reject(error);
            });
        });
    });
}

function setPurchasePaid(graphCoolEndpoint, prendusCloudFunctionJWT, purchaseId) {
    return new Promise((resolve, reject) => {
        fetch(graphCoolEndpoint, {
            method: 'post',
            headers: {
                'content-type': 'application/json',
                'Authorization': `Bearer ${prendusCloudFunctionJWT}`
            },
            body: JSON.stringify({
                query: `
                    mutation {
                        updatePurchase(
                            id: "${purchaseId}"
                            isPaid: true
                        ) {
                            id
                        }
                    }
                `
            })
        })
        .then((response) => response.json())
        .then((responseJSON) => {
          const data = responseJSON.data;
          const errors = responseJSON.errors;

          if (errors) {
              reject(errors);
          }
          else {
              resolve(data);
          }
      });
    });
}
