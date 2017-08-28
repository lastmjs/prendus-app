import {GQLMutate} from '../services/graphql-service';

export async function sendStatement(userToken: string, userId: string, contextId: string, contextType: string, verb: string, object: string): Promise<void> {
  const createStatement = await GQLMutate(`
    mutation{
      createPrendusAnalytics(
        contextId: "${contextId}"
        contextType: ${contextType}
        verb: "${verb}"
        object: "${object}"
      ){
        id
      }
    }
    `, userToken, (error: any) => {
        console.log(error);
  });
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
    `, userToken, (error: any) => {
        console.log(error);
  });
}
