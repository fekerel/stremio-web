// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const { useStreamingServer } = require('stremio/common');
const { useStreamInfo } = require('../StreamInfoContext');

const joinUrl = (baseUrl, path) => `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;

const getPlaybackStream = (stream, streamLink) => {
    const playbackStream = stream && typeof stream === 'object' ?
        { ...stream }
        :
        {};

    if (typeof playbackStream.url !== 'string' && typeof streamLink === 'string') {
        playbackStream.url = streamLink;
    }

    return playbackStream;
};

const getProbeMediaURL = (streamingServerURL, stream) => {
    if (stream === null || typeof stream !== 'object') {
        return null;
    }

    if (typeof stream.url === 'string' && !stream.url.startsWith('magnet:')) {
        return stream.url;
    }

    if (typeof streamingServerURL === 'string' && typeof stream.infoHash === 'string') {
        const fileIdx = stream.fileIdx !== null && stream.fileIdx !== undefined && isFinite(stream.fileIdx) ?
            stream.fileIdx
            :
            -1;

        return joinUrl(streamingServerURL, `${encodeURIComponent(stream.infoHash)}/${encodeURIComponent(fileIdx)}`);
    }

    return null;
};

const normalizeProbeStreams = (probe) => {
    return probe && Array.isArray(probe.streams) ? probe.streams : [];
};

const useProbeFeature = () => {
    const { stream, streamLink } = useStreamInfo();
    const streamingServer = useStreamingServer();
    const abortControllerRef = React.useRef(null);

    const [status, setStatus] = React.useState('idle');
    const [probe, setProbe] = React.useState(null);
    const [error, setError] = React.useState(null);

    const streamingServerURL = React.useMemo(() => {
        return streamingServer.baseUrl && streamingServer.selected ?
            streamingServer.selected.transportUrl
            :
            null;
    }, [streamingServer.baseUrl, streamingServer.selected]);

    const playbackStream = React.useMemo(() => {
        return getPlaybackStream(stream, streamLink);
    }, [stream, streamLink]);

    const mediaURL = React.useMemo(() => {
        return getProbeMediaURL(streamingServerURL, playbackStream);
    }, [playbackStream, streamingServerURL]);

    const loadProbe = React.useCallback(() => {
        if (typeof streamingServerURL !== 'string' || typeof mediaURL !== 'string') {
            abortControllerRef.current?.abort();
            abortControllerRef.current = null;
            setStatus('idle');
            setProbe(null);
            setError(null);
            return Promise.resolve(null);
        }

        abortControllerRef.current?.abort();
        const abortController = new AbortController();
        abortControllerRef.current = abortController;
        const probeUrl = joinUrl(streamingServerURL, `/hlsv2/probe?${new URLSearchParams([['mediaURL', mediaURL]]).toString()}`);

        setStatus('loading');
        setProbe(null);
        setError(null);

        return fetch(probeUrl, {
            signal: abortController.signal,
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Probe request failed: ${response.status}`);
                }

                return response.json();
            })
            .then((probe) => {
                if (abortController.signal.aborted) {
                    return null;
                }

                setProbe(probe);
                setStatus('ready');
                setError(null);
                return probe;
            })
            .catch((error) => {
                if (error.name === 'AbortError') {
                    return null;
                }

                setProbe(null);
                setError(error);
                setStatus('error');
                throw error;
            });
    }, [mediaURL, streamingServerURL]);

    React.useEffect(() => {
        loadProbe().catch(() => null);

        return () => {
            abortControllerRef.current?.abort();
        };
    }, [loadProbe]);

    const streams = React.useMemo(() => normalizeProbeStreams(probe), [probe]);
    const videoStreams = React.useMemo(() => {
        return streams.filter((stream) => stream.track === 'video');
    }, [streams]);
    const audioStreams = React.useMemo(() => {
        return streams.filter((stream) => stream.track === 'audio');
    }, [streams]);
    const subtitleStreams = React.useMemo(() => {
        return streams.filter((stream) => stream.track === 'subtitle');
    }, [streams]);

    return React.useMemo(() => ({
        status,
        error,
        probe,
        mediaURL,
        streamingServerURL,
        streams,
        videoStreams,
        audioStreams,
        subtitleStreams,
        embeddedSubtitles: subtitleStreams,
        loadProbe,
        reloadProbe: loadProbe,
    }), [
        status,
        error,
        probe,
        mediaURL,
        streamingServerURL,
        streams,
        videoStreams,
        audioStreams,
        subtitleStreams,
        loadProbe
    ]);
};

module.exports = useProbeFeature;
