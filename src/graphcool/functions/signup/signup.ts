/*
    Prendus took the source code and has modified it. Here is the original license

    MIT License

    Copyright (c) 2017 Graphcool Examples

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
*/

const fromEvent = require('graphcool-lib').fromEvent;
const bcrypt = require('bcryptjs');
const validator = require('validator');

export default async (event) => {
  if (!event.context.graphcool.pat) {
    console.log('Please provide a valid root token!')
    return { error: 'signup not configured correctly.'}
  }

  const email = event.data.email
  const password = event.data.password
  const graphcool = fromEvent(event)
  const api = graphcool.api('simple/v1')
  const SALT_ROUNDS = 10

  if (validator.isEmail(email)) {
    return getGraphcoolUser(api, email)
      .then(graphcoolUser => {
        if (graphcoolUser === null) {
          return bcrypt.hash(password, SALT_ROUNDS)
            .then(hash => createGraphcoolUser(api, email, hash))
        } else {
          return Promise.reject("Email already in use")
        }
      })
      .then(graphcoolUserId => {
        return graphcool.generateAuthToken(graphcoolUserId, 'User')
          .then(token => {
            return { data: {id: graphcoolUserId, token}}
        })
      })
      .catch((error) => {
        console.log(error)

        // don't expose error message to client!
        return { error: 'An unexpected error occured.' }
      })
  } else {
    return { error: "Not a valid email" }
  }
}

function getGraphcoolUser(api, email) {
  return api.request(`
    query {
      User(email: "${email}") {
        id
      }
    }`)
    .then((userQueryResult) => {
      if (userQueryResult.error) {
        return Promise.reject(userQueryResult.error)
      } else {
        return userQueryResult.User
      }
    })
}

function createGraphcoolUser(api, email, passwordHash) {
  return api.request(`
    mutation {
      createUser(
        email: "${email}",
        password: "${passwordHash}"
      ) {
        id
      }
    }`)
    .then((userMutationResult) => {
      return userMutationResult.createUser.id
    })
}
