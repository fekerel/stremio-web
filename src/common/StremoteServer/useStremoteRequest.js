// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const useLatestAsync = require('../useLatestAsync');
const StremoteServer = require('./client');

const DEFAULT_CONCURRENCY = 'latest';

const parseResponse = (response) => {
    if (!response.ok) {
        throw new Error(`Stremote request failed: ${response.status}`);
    }

    if (response.status === 204) {
        return null;
    }

    const contentType = response.headers.get('content-type') || '';
    return contentType.includes('application/json') ?
        response.json()
        :
        response.text();
};

const useStremoteRequest = () => {
    const { run } = useLatestAsync();

    return React.useCallback((path, requestOptions = {}, lifecycleOptions = {}) => {
        const safeRequestOptions = requestOptions || {};
        const safeLifecycleOptions = lifecycleOptions || {};
        const {
            concurrency = DEFAULT_CONCURRENCY,
            onSuccess,
            onError,
            onFinally
        } = safeLifecycleOptions;

        if (!['latest', 'parallel'].includes(concurrency)) {
            throw new Error(`Unsupported Stremote request concurrency: ${concurrency}`);
        }

        if (concurrency === 'parallel') {
            return StremoteServer.request(path, safeRequestOptions)
                .then(parseResponse)
                .then((result) => {
                    if (typeof onSuccess === 'function') {
                        onSuccess(result);
                    }

                    return result;
                })
                .catch((error) => {
                    if (typeof onError === 'function') {
                        onError(error);
                    }

                    throw error;
                })
                .finally(() => {
                    if (typeof onFinally === 'function') {
                        onFinally();
                    }
                });
        }

        return run({
            task: ({ signal }) => StremoteServer.request(path, {
                ...safeRequestOptions,
                signal
            }).then(parseResponse),
            onSuccess,
            onError,
            onFinally
        });
    }, [run]);
};

module.exports = useStremoteRequest;
