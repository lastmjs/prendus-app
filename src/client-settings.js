if (window.location.hostname === 'www.prendus.com') {
    window.process = {
        env: {
            NODE_ENV: 'production'
        }
    };
}
else {
    window.process = {
        env: {
            NODE_ENV: 'development'
        }
    };
}

// This allows us to import ES modules without a file extension, because the JS extension will automatically be appended if it is not there. Important for our TypeScript workflow
System.config({
    packages: {
        '': {
            defaultExtension: 'js'
        }
    }
});
