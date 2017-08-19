import {GQLMutate} from '../services/graphql-service';

export async function sendStatement(userId: string, contextId: string, contextType: string, verb: string, object: string): Promise<void> {
  const createStatement = await GQLMutate(`
    mutation{
      createPrendusAnalytics(
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
  console.log('createStatement', createStatement.createPrendusAnalytics.id)
  const data = await GQLMutate(`
    mutation {
      addToUserOnPrendusAnalytics(
        userUserId: "${userId}"
        userAnalyticsPrendusAnalyticsId: "${createStatement.createPrendusAnalytics.id}"
      ){
        userUser{
          id
        }
        userAnalyticsPrendusAnalytics {
          id
        }
      }
    }
    `, this.userToken, (error: any) => {
        console.log(error);
  });
  console.log('data', data)
}