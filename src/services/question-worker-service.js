onmessage = function(e) {

    try {
        const userCode = e.data.userCode;
        const userVariables = e.data.userVariables;
        const userInputs = e.data.userInputs;

        const generateRandomInteger = (min, max) => {
            //returns a random integer between min (included) and max (included)
            return Math.floor(Math.random() * (max - min + 1)) + min;
        };

        const handler = {
            set: (target, key, value, receiver) => {
                if (key === 'min') {
                    target.min = value;
                    target.value = generateRandomInteger(target.min, target.max);
                }

                if (key === 'max') {
                    target.max = value;
                    target.value = generateRandomInteger(target.min, target.max);
                }

                if (key === 'precision') {
                    target.value = value;
                }
            },
            get: (target, prop, receiver) => {
                return function() {
                    return target.value;
                };
            }
        };

        const createUserVariableObjects = userVariables.reduce((prev, curr) => {
            return `${prev} var ${curr}_orig_object = { min: 1, max: 10, value: generateRandomInteger(1, 10) };`;
        }, '');

        const createProxies = userVariables.reduce((prev, curr) => {
            return `${prev} var ${curr} = new Proxy(${curr}_orig_object, handler);`;
        }, '');

        let answer = {};
        let hint = '';

        eval(createUserVariableObjects);
        eval(createProxies);

        try {
            eval(userCode);
        }
        catch(error) {
            postMessage({
                errorMessage: `there was an error in your code: ${error.message}`
            }); //TODO There is a second parameter to postMessage that I might need to add here in the future. The second parameter specifies the domain that can receive the message
        }

        let convertedToPrimitivesAnswer = userInputs.reduce((prev, curr) => {
            if (prev[curr] && typeof prev[curr].value === 'function') {
                return Object.assign({}, prev, {
                    [curr]: prev[curr].value()
                });
            }

            return prev;
        }, answer);

        if (typeof convertedToPrimitivesAnswer.value === 'function') {
            convertedToPrimitivesAnswer = convertedToPrimitivesAnswer.value();
        }

        const userVariableValues = userVariables.map((element) => {

            let evaluatedElement = eval(element);

            if (typeof evaluatedElement !== 'string' && typeof evaluatedElement !== 'number') {
                //if the user variables are still proxy objects. They must be converted to their primitive values
                evaluatedElement = +evaluatedElement;
            }

            return {
                name: element,
                value: evaluatedElement
            };
        });

        postMessage({
            answer: convertedToPrimitivesAnswer,
            // hint,
            userVariableValues,
            errorMessage: null
        }); //TODO There is a second parameter to postMessage that I might need to add here in the future. The second parameter specifies the domain that can receive the message
    }
    catch(error) {
        postMessage({
            errorMessage: `there was an error while evaluating the answer to your question`
        }); //TODO There is a second parameter to postMessage that I might need to add here in the future. The second parameter specifies the domain that can receive the message
    }
};
