const endpoint = 'https://api.graph.cool/simple/v1/cj36de9q4dem00134bhkwm44r';

export const GQLRedux = async (queryString, component) => {

    //TODO to allow for good cacheing, we'll probably need to parse the queryString so that we can get all of the properties that we need


    const response = await window.fetch(endpoint, {
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
