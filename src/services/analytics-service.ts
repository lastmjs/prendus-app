import {GQLRequest} from '../services/graphql-service';

export async function sendStatement(userId: string, contextId: string, contextType: string, verb: string, obj: string): Promise<void> {
  const createStatement = await GQLRequest(`
    mutation analytics($contextId: String!, $contextType: ContextType!, $verb: String!, $obj: String!, $userId: ID!) {
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
    `,
    {userId, contextId, contextType, verb, obj},
    '', //TODO: pass in user token or retrieve it from redux
    (error: any) => {
      console.log(error);
    }
  });
}
