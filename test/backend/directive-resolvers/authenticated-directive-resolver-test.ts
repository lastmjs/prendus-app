// import {authenticatedDirectiveResolver} from '../../../backend/directive-resolvers';
import {GraphQLClient} from '../../../node_modules/graphql-request/dist/src/index';

import * as jsverify from 'jsverify';
// import * as jsverify from '../../../node_modules/jsverify/lib/jsverify';
// const client = new GraphQLClient(`http://localhost:4000`);
// const jsverify = require('../../../node_modules/jsverify/lib/jsverify');
// const jsverify = require('../../../node_modules/jsverify/lib/jsverify');

// const jsverify = require('jsverify');

class AuthenticatedDirectiveResolverTest extends HTMLElement {
    prepareTests(test: any) {
        test('Try it out', [jsverify.number], (arbNumber: number) => {
            console.log(arbNumber);
        });
    }
}

window.customElements.define('authenticated-directive-resolver-test', AuthenticatedDirectiveResolverTest);
