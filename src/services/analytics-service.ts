import {GQLMutate} from '../services/graphql-service';

export async function sendStatement(userId: string, contextId: string, contextType: string, verb: string, object: string): Promise<void> {
  await GQLMutate(`
      mutation{
        createPrendusAnalytics(
          userId: "${userId}"
          contextId: "${contextId}"
          contextType: "${contextType}"
          verb: "${verb}"
          object: "${object}"
        ){
          id
        }
      }
      `, this.userToken, (error: any) => {
          console.log(error);
      });
}
