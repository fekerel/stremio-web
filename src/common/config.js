// Copyright (C) 2017-2026 Smart code 203358507

const normalizeBaseUrl = (value) => {
    if (typeof value !== 'string' || value.trim().length === 0) {
        return window.location.origin;
    }

    const url = new URL(value, window.location.origin);
    return url.toString().replace(/\/+$/, '');
};

const createEndpointUrl = (baseUrl, pathname) => {
    return `${baseUrl}/${pathname.replace(/^\/+/, '')}`;
};

const createWebSocketUrl = (baseUrl, pathname) => {
    const url = new URL(createEndpointUrl(baseUrl, pathname));

    if (url.protocol === 'https:') {
        url.protocol = 'wss:';
    } else if (url.protocol === 'http:') {
        url.protocol = 'ws:';
    }

    return url.toString().replace(/\/+$/, '');
};

const getRuntimeConfig = () => {
    return window.STREMIO_WEB_CONFIG || {};
};

const BASE_URL = normalizeBaseUrl(
    getRuntimeConfig().apiBaseUrl
);
const API_BASE_URL = createEndpointUrl(BASE_URL, '/api');
const WS_BASE_URL = createWebSocketUrl(BASE_URL, '/ws');

module.exports = {
    API_BASE_URL,
    WS_BASE_URL,
};
