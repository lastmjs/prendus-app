import {GQLRequest} from '../node_modules/prendus-shared/services/graphql-service';

function handleError(err: any) {
  console.error(err);
}

export async function sendStatement(userToken: string, variables: object): Promise<void> {
  return GQLRequest(`
    mutation analytics($userId: ID!, $verb: String!, $questionId: ID, $assignmentId: ID, $courseId: ID) {
      createPrendusAnalytics(
        assignmentId: $assignmentId
        courseId: $courseId
        verb: $verb
        questionId: $questionId
        userId: $userId
      ){
        id
      }
    }
  `, variables, userToken, handleError)
};
