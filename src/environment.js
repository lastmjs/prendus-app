if (window.location.hostname === 'prendus.com') {
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
