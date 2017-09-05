const JWT = require('jsonwebtoken');
const fetch = require('isomorphic-fetch');
const graphCoolEndpoint = 'https://api.graph.cool/simple/v1/cj36de9q4dem00134bhkwm44r';
const prendusCloudFunctionJWT = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE0OTY4NjI4ODUsImNsaWVudElkIjoiY2oyd2lmdnZmM29raTAxNTRtZnN0c2lscCIsInByb2plY3RJZCI6ImNqMzZkZTlxNGRlbTAwMTM0Ymhrd200NHIiLCJwZXJtYW5lbnRBdXRoVG9rZW5JZCI6ImNqM25kaWlidGZmcTUwMTczdnJma2p6cTAifQ.rsV46JtH7yOxB-kz17UDs33XIfHpBT72M_OSLlQq1LA';

module.exports = function(event) {
  const ltiJWT = event.data.User.node.ltiJWT;

  if (ltiJWT) {
      const userId = event.data.User.node.id;
      const payload = JWT.verify(ltiJWT, 'secret');
      const ltiUserId = payload.ltiUserId;
      const assignmentId = payload.assignmentId;


      return new Promise((resolve, reject) => {
          getCourseId(graphCoolEndpoint, prendusCloudFunctionJWT, assignmentId)
          .then((courseId) => {
              createLTIUser(graphCoolEndpoint, prendusCloudFunctionJWT, ltiUserId, userId)
              .then((data) => {
                  return enrollUserOnCourse(graphCoolEndpoint, prendusCloudFunctionJWT, userId, courseId);
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
  }
};

function createLTIUser(graphCoolEndpoint, prendusCloudFunctionJWT, ltiUserId, userId) {
    return new Promise(function(resolve, reject) {
        fetch(graphCoolEndpoint, {
              method: 'post',
              headers: {
                  'content-type': 'application/json',
                  'Authorization': `Bearer ${prendusCloudFunctionJWT}`
              },
              body: JSON.stringify({
                  query: `
                    mutation {
                    	createLTIUser(
                    		ltiUserId: "${ltiUserId}"
                    		userId: "${userId}"
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

function enrollUserOnCourse(graphCoolEndpoint, prendusCloudFunctionJWT, userId, courseId) {
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

function getCourseId(graphCoolEndpoint, prendusCloudFunctionJWT, assignmentId) {
    return new Promise(function(resolve, reject) {
        fetch(graphCoolEndpoint, {
              method: 'post',
              headers: {
                  'content-type': 'application/json',
                  'Authorization': `Bearer ${prendusCloudFunctionJWT}`
              },
              body: JSON.stringify({
                  query: `
                    query {
                    	Assignment(
                    		id: "${assignmentId}"
                    	) {
                    		course {
                                id
                            }
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
              resolve(data.Assignment.course.id);
          }
        });
    });
}
