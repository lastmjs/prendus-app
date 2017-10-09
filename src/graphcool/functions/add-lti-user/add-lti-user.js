const JWT = require('jsonwebtoken');
const fromEvent = require('graphcool-lib').fromEvent;

module.exports = function(event) {
    if (!event.context.graphcool.pat) {
        console.log('Please provide a valid root token!')
        return { error: 'Email Authentication not configured correctly.'}
    }

    const graphcool = fromEvent(event);
    const api = graphcool.api('simple/v1');
    const jwt = event.data.jwt;
    const payload = JWT.verify(jwt, event.context.graphcool.pat);
    const userId = event.data.userId;
    const ltiUserId = payload.ltiUserId;
    const assignmentId = payload.assignmentId;
    const lisPersonContactEmailPrimary = payload.lisPersonContactEmailPrimary;

    return new Promise((resolve, reject) => {
        getCourseId(api, assignmentId)
        .then((courseId) => {
            createLTIUser(api, ltiUserId, userId, lisPersonContactEmailPrimary)
            .then((data) => {
                return enrollUserOnCourse(api, userId, courseId);
            })
            .then((data) => {
                return payForCourseIfFree(api, userId, courseId);
            })
            .then((data) => {
               resolve(data);
            })
            .catch((error) => {
                reject(error);
            });
        })
        .catch((error) => {
            reject(error);
        });
    });
};

function createLTIUser(api, ltiUserId, userId, lisPersonContactEmailPrimary) {
    return api.request(`
      mutation {
          createLTIUser(
              ltiUserId: "${ltiUserId}"
              userId: "${userId}"
              lisPersonContactEmailPrimary: "${lisPersonContactEmailPrimary}"
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
            return result.createLTIUser.id;
        }
    });
}

function enrollUserOnCourse(api, userId, courseId) {
    return api.request(`
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
    `)
    .then((result) => {
        if (result.error) {
            return Promise.reject(result.error);
        }
        else {
            return result.addToStudentsAndCourses.enrolledStudentsUser.id;
        }
    });
}

function getCourseId(api, assignmentId) {
    return api.request(`
      query {
          Assignment(
              id: "${assignmentId}"
          ) {
              course {
                  id
              }
          }
      }
    `)
    .then((result) => {
        if (result.error) {
            return Promise.reject(result.error);
        }
        else {
            return result.Assignment.course.id;
        }
    });
}

function payForCourseIfFree(api, userId, courseId) {
    return api.request(`
      query {
          Course(
              id: "${courseId}"
          ) {
              price
          }
      }
    `)
    .then((result) => {
        if (result.error) {
            return Promise.reject(result.error);
        }
        else {
            if (result.Course.price === 0) {
                return api.request(`
                    query {
                        allPurchases(filter: {
                            user: {
                                id: "${userId}"
                            }
                            course: {
                                id: "${courseId}"
                            }
                        })
                    }
                `)
                .then((result) => {
                    if (result.error) {
                        return Promise.reject(result.error);
                    }
                    else {
                        if (result.allPurchases.length === 0) {
                            return api.request(`
                                mutation {
                                	createPurchase(
                                	       userId: "${userId}"
                                           amount: 0
                                           courseId: "${courseId}"
                                           isPaid: true
                                           stripeTokenId: "there is no stripeTokenId for a free course"
                                	) {
                                		course {
                                            price
                                        }
                                	}
                                }
                            `)
                            .then((result) => {
                                if (result.error) {
                                    return Promise.reject(result.error);
                                }
                                else {
                                    return result.createPurchase.course.price;
                                }
                            });
                        }
                    }
                });
            }
        }
    });
}
