const httpEndpoint = 'https://api.graph.cool/simple/v1/cj36de9q4dem00134bhkwm44r';

//TODO the GraphQL web socket protocol used below is deprecated and will be changing soon: https://github.com/apollographql/subscriptions-transport-ws/issues/149
//TODO We'll need to wait for graph.cool to update their back end before we change our client
const webSocket = new WebSocket('wss://subscriptions.graph.cool/v1/cj36de9q4dem00134bhkwm44r', 'graphql-subscriptions');

webSocket.onopen = () => {
    const message: OperationMessage = {
        id: '1',
        type: 'init'
    };

    webSocket.send(JSON.stringify(message));
};

webSocket.onmessage = (event) => {
    const data: OperationMessage = JSON.parse(event.data);

    console.log(data);

    switch (data.type) {
        case 'init_success': {
            console.log('init_success');
            break;
        }
        case 'init_fail': {
            throw {
                message: 'init_fail returned from WebSocket server',
                data
            };
        }
        case 'subscription_success': {
            console.log('subscription_success');
            break;
        }
        case 'subscription_fail': {
            throw {
                message: 'subscription_fail returned from WebSocket server',
                data
            };
        }
    }
};

export const GQLRedux = async (queryString, component) => {

    //TODO to allow for good cacheing, we'll probably need to parse the queryString so that we can get all of the properties that we need


    const response = await window.fetch(httpEndpoint, {
        method: 'post',
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            query: queryString
        })
    });

    const data = (await response.json()).data;

    Object.keys(data).forEach((key) => {
        component.action = {
            type: 'SET_PROPERTY',
            key,
            value: data[key]
        };
    });

    return data;
};

export const GQLSubscribe = (queryString) => {
    const message = {
        id: '2',
        type: 'subscription_start',
        query: queryString
    };

    webSocket.send(JSON.stringify(message));
};
