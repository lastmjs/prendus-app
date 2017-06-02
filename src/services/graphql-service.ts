const httpEndpoint = 'https://api.graph.cool/simple/v1/cj36de9q4dem00134bhkwm44r';

//TODO the GraphQL web socket protocol used below is deprecated and will be changing soon: https://github.com/apollographql/subscriptions-transport-ws/issues/149
//TODO We'll need to wait for graph.cool to update their back end before we change our client
let webSocket = new WebSocket('wss://subscriptions.graph.cool/v1/cj36de9q4dem00134bhkwm44r', 'graphql-subscriptions');

webSocket.onopen = (event) => {
    const message = {
        type: 'init'
    };

    webSocket.send(JSON.stringify(message));
};

webSocket.onmessage = (event) => {
    const data = JSON.parse(event.data);

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
        case 'subscription_data': {
            subscriptions[data.id](data);
            break;
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

let subscriptions = {};

export const GQLQuery = async (queryString, callback) => {

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
        callback(key, data[key]);
    });

    return data;
};

export const GQLMutate = async (queryString) => {

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

    return data;
};

//TODO potentially gaurd against multiple subscriptions
export const GQLSubscribe = (queryString, id, callback) => {
    // we need to wait for the webSocket's connection to be open
    if (webSocket.readyState !== webSocket.OPEN) {
        setTimeout(() => {
            GQLSubscribe(queryString, id, callback); // allow other tasks to run by throwing this function onto the event loop. This creates an infinite non-blocking retry
        });
        return;
    }

    subscriptions[id] = callback;

    const message = {
        id,
        type: 'subscription_start',
        query: queryString
    };

    webSocket.send(JSON.stringify(message));
};
