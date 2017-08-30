import {GQLRequest} from '../node_modules/prendus-shared/services/graphql-service';

export async function sendStatement(userId: string, contextId: string, contextType: string, verb: string, obj: string): Promise<void> {
  await GQLRequest(`
    mutation statement($userId: ID, $contextId: String!, $contextType: ContextType!, $verb: String!, $obj: String!) {
      createPrendusAnalytics(
        contextId: $contextId
        contextType: $contextType
        verb: $verb
        object: $obj
        userId: $userId
      ){
        id
      }
    }
    `, {userId, contextId, contextType, verb, obj}, this.userToken, (error: any) => {
        console.log(error);
  });
}
