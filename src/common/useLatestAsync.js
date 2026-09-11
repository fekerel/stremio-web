// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');

const isAbortError = (error) => error?.name === 'AbortError';

const useLatestAsync = () => {
    const abortControllerRef = React.useRef(null);
    const taskIdRef = React.useRef(0);

    const abort = React.useCallback(() => {
        if (abortControllerRef.current !== null) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        taskIdRef.current += 1;
    }, []);

    const run = React.useCallback(({ task, onSuccess, onError, onFinally }) => {
        abort();

        const taskId = taskIdRef.current;
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        return task({ signal: abortController.signal })
            .then((result) => {
                if (taskId !== taskIdRef.current) {
                    return null;
                }

                if (typeof onSuccess === 'function') {
                    onSuccess(result);
                }

                return result;
            })
            .catch((error) => {
                if (isAbortError(error) || taskId !== taskIdRef.current) {
                    return null;
                }

                if (typeof onError === 'function') {
                    onError(error);
                }

                throw error;
            })
            .finally(() => {
                if (taskId === taskIdRef.current) {
                    abortControllerRef.current = null;

                    if (typeof onFinally === 'function') {
                        onFinally();
                    }
                }
            });
    }, [abort]);

    React.useEffect(() => abort, [abort]);

    return {
        abort,
        run
    };
};

module.exports = useLatestAsync;
