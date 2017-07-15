#!/bin/bash

# First transpile all of the TypeScript files in this project
tsc --module ES2015 --target ES2015 || echo TypeScript compilation complete

# Copy the src directory into the dist directory
cp -r src dist

# Replace all .ts extensions in script tags to .js
cd dist
find . -name '*.html' -exec sed -i 's/.ts"><\/script>/.js"><\/script>/g' {} \;

# Remove all of the transpiled JS files from this project
cd ../src
rm typings/*.js
rm services/*.js
rm redux/*.js
rm components/*/*.js

# Bundle all of the JS files in each web component as IIFEs so that we don't have to use SystemJS
cd ../dist
for directory in components/* ; do
    for file in $directory/*.js ; do
        rollup $file --format iife --output $file
    done
done
