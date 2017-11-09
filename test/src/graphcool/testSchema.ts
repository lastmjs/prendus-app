const fs = require('fs');
const path = require('path');
const {
  buildSchema
} = require('graphql');

const schemaPath = path.resolve(process.cwd(), 'test/src/graphcool/schema.graphql');
const schemaText = fs.readFileSync(schemaPath, 'utf8');

export const schema = buildSchema(schemaText);
