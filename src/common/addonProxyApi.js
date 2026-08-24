// Copyright (C) 2017-2026 Smart code 203358507

const { request } = require('./apiClient');
const { API_BASE_URL } = require('./config');

const resolveProxyManifestUrl = (proxyManifestUrl) => {
    return new URL(proxyManifestUrl, `${API_BASE_URL}/`).toString();
};

const createAddonProxy = async (manifestUrl) => {
    const response = await request('/addon-proxies', {
        method: 'POST',
        body: JSON.stringify({ manifestUrl }),
    });

    const proxyManifestUrl = response?.manifestUrl;
    if (typeof proxyManifestUrl !== 'string' || proxyManifestUrl.length === 0) {
        throw new Error('Invalid addon proxy response');
    }

    return resolveProxyManifestUrl(proxyManifestUrl);
};

module.exports = {
    createAddonProxy,
};
