#!/bin/bash

# Copy the src directory into the dist directory
rm -rf dist
cp -r src dist
cd dist

echo "Compile all of the TS files to JS files in the components directory"

# Compile all of the TS files to JS files in the components directory
for directory in components/* ; do
    for file in $directory/*.ts ; do
        ../node_modules/.bin/tsc --module ES2015 --target ES2015 $file > /dev/null
    done
done

echo "Compile all of the TS files to JS files in the redux directory"

# Compile all of the TS files to JS files in the redux directory
for file in redux/*.ts ; do
    ../node_modules/.bin/tsc --module ES2015 --target ES2015 $file > /dev/null
done

echo "Compile all of the TS files to JS files in the services directory"

# Compile all of the TS files to JS files in the services directory
for file in services/*.ts ; do
    ../node_modules/.bin/tsc --module ES2015 --target ES2015 $file > /dev/null
done

echo "Bundle all of the JS files in each web component as IIFEs so that we don't have to use any non-native module loader (use native modules once they are supported in all of the major browsers)"

# Bundle all of the JS files in each web component as IIFEs so that we don't have to use any non-native module loader (use native modules once they are supported in all of the major browsers)
for directory in components/* ; do
    for file in $directory/*.js ; do
        ../node_modules/.bin/rollup $file --format iife --output $file > /dev/null
    done
done

echo "Replace all .ts extensions in script tags to .js"

# Replace all .ts extensions in script tags to .js
find . -name '*.html' -exec sed -i 's/.ts"><\/script>/.js"><\/script>/g' {} \;

echo "Static build complete!"
