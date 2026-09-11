const isWebpackServe = process.env.WEBPACK_SERVE === true || process.env.WEBPACK_SERVE === 'true';

const getBaseUrl = () => {
    if (isWebpackServe) {
        return process.env.STREMOTE_SERVER_URL;
    }

    return window.location.origin;
};

const joinUrl = (baseUrl, path) => `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;

const getWebSocketBaseUrl = () => {
    const baseUrl = getBaseUrl();

    if (!baseUrl) {
        return baseUrl;
    }

    if (baseUrl.startsWith('https://')) {
        return baseUrl.replace(/^https:/, 'wss:');
    }

    if (baseUrl.startsWith('http://')) {
        return baseUrl.replace(/^http:/, 'ws:');
    }

    return baseUrl;
};

const request = (path, options) => {
    const baseUrl = getBaseUrl();

    if (!baseUrl) {
        throw new Error('STREMOTE_SERVER_URL is not configured');
    }

    return fetch(joinUrl(baseUrl, path), options);
};

const getWebSocketUrl = (path) => {
    const baseUrl = getWebSocketBaseUrl();

    if (!baseUrl) {
        throw new Error('STREMOTE_SERVER_URL is not configured');
    }

    return joinUrl(baseUrl, path);
};

module.exports = {
    getBaseUrl,
    getWebSocketUrl,
    request,
};
