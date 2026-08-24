// Copyright (C) 2017-2026 Smart code 203358507

const { API_BASE_URL } = require('./config');

const resolveUrl = (path) => {
    const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`;
    const normalizedPath = typeof path === 'string' && path.startsWith('/') ? path.slice(1) : path;
    return new URL(normalizedPath, baseUrl).toString();
};

const parseResponseBody = async (response) => {
    const text = await response.text();
    if (text.length === 0) {
        return null;
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        return JSON.parse(text);
    }

    return text;
};

const request = async (path, options = {}) => {
    const response = await fetch(resolveUrl(path), {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });
    const body = await parseResponseBody(response);

    if (!response.ok) {
        const message = typeof body === 'object' && body !== null ?
            body.message || body.error || response.statusText
            :
            response.statusText;
        throw new Error(message);
    }

    return body;
};

module.exports = {
    request,
};
