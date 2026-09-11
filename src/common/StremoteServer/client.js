const isWebpackServe = process.env.WEBPACK_SERVE === true || process.env.WEBPACK_SERVE === 'true';

const getBaseUrl = () => {
    if (isWebpackServe) {
        return process.env.STREMOTE_SERVER_URL;
    }

    return window.location.origin;
};

const joinUrl = (baseUrl, path) => `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;

const request = (path, options) => {
    const baseUrl = getBaseUrl();

    if (!baseUrl) {
        throw new Error('STREMOTE_SERVER_URL is not configured');
    }

    return fetch(joinUrl(baseUrl, path), options);
};

module.exports = {
    getBaseUrl,
    request,
};