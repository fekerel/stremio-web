// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const useLiveRef = require('../useLiveRef');
const StremoteServer = require('./client');

const DEFAULT_RECONNECT_DELAYS = [1000, 2000, 5000, 10000];
const SOCKET_OPEN = 1;

const getProtocolKey = (protocols) => Array.isArray(protocols) ? protocols.join('\n') : protocols || '';

const getReconnectDelay = (attempt, reconnectDelays) => {
    const delays = Array.isArray(reconnectDelays) && reconnectDelays.length > 0 ?
        reconnectDelays
        :
        DEFAULT_RECONNECT_DELAYS;

    return delays[Math.min(attempt, delays.length - 1)];
};

const parseMessage = (event) => {
    const message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

    if (!message || typeof message.type !== 'string') {
        throw new Error('Stremote WebSocket message is missing type');
    }

    return message;
};

const useStremoteSocket = (path, options = {}) => {
    const {
        enabled = true,
        protocols
    } = options || {};

    const optionsRef = useLiveRef(options || {});
    const socketRef = React.useRef(null);
    const reconnectTimeoutRef = React.useRef(null);
    const reconnectAttemptRef = React.useRef(0);
    const closeRequestedRef = React.useRef(false);
    const [status, setStatus] = React.useState('idle');
    const [lastMessage, setLastMessage] = React.useState(null);
    const [lastError, setLastError] = React.useState(null);
    const protocolKey = getProtocolKey(protocols);

    const clearReconnectTimeout = React.useCallback(() => {
        if (reconnectTimeoutRef.current !== null) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
    }, []);

    const send = React.useCallback((message) => {
        const socket = socketRef.current;

        if (!socket || socket.readyState !== SOCKET_OPEN) {
            return false;
        }

        socket.send(typeof message === 'string' ? message : JSON.stringify(message));
        return true;
    }, []);

    const close = React.useCallback(() => {
        closeRequestedRef.current = true;
        clearReconnectTimeout();

        if (socketRef.current !== null) {
            socketRef.current.close();
            socketRef.current = null;
        }

        setStatus('closed');
    }, [clearReconnectTimeout]);

    React.useEffect(() => {
        if (!enabled || !path) {
            closeRequestedRef.current = true;
            clearReconnectTimeout();

            if (socketRef.current !== null) {
                socketRef.current.close();
                socketRef.current = null;
            }

            setStatus('idle');
            return undefined;
        }

        closeRequestedRef.current = false;
        let active = true;

        const connect = () => {
            let socket;

            try {
                socket = new WebSocket(StremoteServer.getWebSocketUrl(path), protocols);
            } catch (error) {
                if (!active) {
                    return;
                }

                setStatus('error');
                setLastError(error);

                if (typeof optionsRef.current.onError === 'function') {
                    optionsRef.current.onError(error);
                }

                return;
            }

            socketRef.current = socket;
            setStatus(reconnectAttemptRef.current === 0 ? 'connecting' : 'reconnecting');

            socket.onopen = (event) => {
                if (!active || socketRef.current !== socket) {
                    return;
                }

                reconnectAttemptRef.current = 0;
                setStatus('open');
                setLastError(null);

                if (typeof optionsRef.current.onOpen === 'function') {
                    optionsRef.current.onOpen(event);
                }
            };

            socket.onmessage = (event) => {
                if (!active || socketRef.current !== socket) {
                    return;
                }

                let message;

                try {
                    message = parseMessage(event);
                } catch (error) {
                    setLastError(error);

                    if (typeof optionsRef.current.onError === 'function') {
                        optionsRef.current.onError(error, event);
                    }

                    return;
                }

                setLastMessage(message);

                if (typeof optionsRef.current.onMessage === 'function') {
                    optionsRef.current.onMessage(message, event);
                }
            };

            socket.onerror = (event) => {
                if (!active || socketRef.current !== socket) {
                    return;
                }

                const error = new Error('Stremote WebSocket error');
                setStatus('error');
                setLastError(error);

                if (typeof optionsRef.current.onError === 'function') {
                    optionsRef.current.onError(error, event);
                }
            };

            socket.onclose = (event) => {
                if (!active) {
                    return;
                }

                if (socketRef.current === socket) {
                    socketRef.current = null;
                }

                if (typeof optionsRef.current.onClose === 'function') {
                    optionsRef.current.onClose(event);
                }

                if (closeRequestedRef.current) {
                    setStatus('closed');
                    return;
                }

                const shouldReconnect = typeof optionsRef.current.shouldReconnect === 'function' ?
                    optionsRef.current.shouldReconnect(event)
                    :
                    true;

                if (optionsRef.current.reconnect === true && shouldReconnect) {
                    const delay = getReconnectDelay(reconnectAttemptRef.current, optionsRef.current.reconnectDelays);
                    reconnectAttemptRef.current += 1;
                    setStatus('reconnecting');
                    reconnectTimeoutRef.current = setTimeout(connect, delay);
                } else {
                    setStatus('closed');
                }
            };
        };

        connect();

        return () => {
            active = false;
            closeRequestedRef.current = true;
            clearReconnectTimeout();

            if (socketRef.current !== null) {
                socketRef.current.onopen = null;
                socketRef.current.onmessage = null;
                socketRef.current.onerror = null;
                socketRef.current.onclose = null;
                socketRef.current.close();
                socketRef.current = null;
            }
        };
    }, [clearReconnectTimeout, enabled, path, protocolKey]);

    return {
        status,
        lastMessage,
        lastError,
        send,
        close
    };
};

module.exports = useStremoteSocket;
