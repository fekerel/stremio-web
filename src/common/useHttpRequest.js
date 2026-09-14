// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const useLatestAsync = require('./useLatestAsync');

const DEFAULT_CONCURRENCY = 'latest';
const DEFAULT_RESPONSE_TYPE = 'auto';

const parseResponse = (response, responseType = DEFAULT_RESPONSE_TYPE) => {
    if (!response.ok) {
        throw new Error(`HTTP request failed: ${response.status}`);
    }

    if (response.status === 204) {
        return null;
    }

    switch (responseType) {
        case 'auto': {
            const contentType = response.headers.get('content-type') || '';

            return contentType.includes('application/json') ?
                response.json()
                :
                response.text();
        }
        case 'json': {
            return response.json();
        }
        case 'text': {
            return response.text();
        }
        case 'blob': {
            return response.blob();
        }
        case 'arrayBuffer': {
            return response.arrayBuffer();
        }
        case 'response': {
            return response;
        }
        default: {
            throw new Error(`Unsupported HTTP response type: ${responseType}`);
        }
    }
};

const useHttpRequest = () => {
    const { run } = useLatestAsync();

    return React.useCallback((input, requestOptions = {}, lifecycleOptions = {}) => {
        const safeRequestOptions = requestOptions || {};
        const safeLifecycleOptions = lifecycleOptions || {};
        const {
            concurrency = DEFAULT_CONCURRENCY,
            responseType = DEFAULT_RESPONSE_TYPE,
            onSuccess,
            onError,
            onFinally
        } = safeLifecycleOptions;

        if (!['latest', 'parallel'].includes(concurrency)) {
            throw new Error(`Unsupported HTTP request concurrency: ${concurrency}`);
        }

        if (concurrency === 'parallel') {
            return fetch(input, safeRequestOptions)
                .then((response) => parseResponse(response, responseType))
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
            task: ({ signal }) => fetch(input, {
                ...safeRequestOptions,
                signal
            }).then((response) => parseResponse(response, responseType)),
            onSuccess,
            onError,
            onFinally
        });
    }, [run]);
};

module.exports = useHttpRequest;
