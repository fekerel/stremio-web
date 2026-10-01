// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const { useToast } = require('stremio/common');
const { useStremoteRequest } = require('stremio/common/StremoteServer');
const { useDevicePicker } = require('./DevicePicker/DevicePickerContext');
const { useStreamInfo } = require('./StreamInfoContext');
const { usePreviewSubtitles } = require('./SubtitleSettings/SubtitleContext');

const SESSIONS_PATH = '/api/playback/sessions/';

const getStreamSourceUrl = (stream, streamLink) => {
    if (typeof streamLink === 'string' && streamLink.trim().length > 0) {
        return streamLink;
    }

    return stream !== null && typeof stream === 'object' && typeof stream.url === 'string' && stream.url.trim().length > 0 ?
        stream.url
        :
        null;
};

const usePlayOnTvSession = ({ onSuccess } = {}) => {
    const toast = useToast();
    const request = useStremoteRequest();
    const { selectedDevice } = useDevicePicker();
    const { stream, streamLink } = useStreamInfo();
    const { selectedSubtitle, subtitleDelay } = usePreviewSubtitles();
    const [loading, setLoading] = React.useState(false);

    const sourceUrl = React.useMemo(() => getStreamSourceUrl(stream, streamLink), [stream, streamLink]);
    const canPlay = selectedDevice !== null && sourceUrl !== null && !loading;

    const play = React.useCallback(() => {
        if (loading) {
            return Promise.resolve(null);
        }

        if (selectedDevice === null) {
            toast.show({
                type: 'error',
                title: 'Select a device first',
                timeout: 4000
            });

            return Promise.resolve(null);
        }

        if (sourceUrl === null) {
            toast.show({
                type: 'error',
                title: 'Stream URL is missing',
                timeout: 4000
            });

            return Promise.resolve(null);
        }

        const body = {
            deviceRegistryId: selectedDevice.id,
            sourceUrl
        };

        if (selectedSubtitle !== null && typeof selectedSubtitle.url === 'string') {
            body.subtitle = {
                url: selectedSubtitle.url,
                shiftMs: typeof subtitleDelay === 'number' && isFinite(subtitleDelay) ? subtitleDelay : 0
            };
        }

        setLoading(true);

        return request(SESSIONS_PATH, {
            method: 'POST',
            headers: {
                'content-type': 'application/json'
            },
            body: JSON.stringify(body)
        }, {
            concurrency: 'latest',
            onSuccess: () => {
                if (typeof onSuccess === 'function') {
                    onSuccess();
                }

                toast.show({
                    type: 'success',
                    title: 'Playback started on TV',
                    timeout: 4000
                });
            },
            onError: (error) => {
                toast.show({
                    type: 'error',
                    title: 'Failed to start playback on TV',
                    message: error.message,
                    timeout: 5000
                });
            },
            onFinally: () => {
                setLoading(false);
            }
        }).catch(() => null);
    }, [loading, onSuccess, request, selectedDevice, selectedSubtitle, sourceUrl, subtitleDelay, toast]);

    return React.useMemo(() => ({
        canPlay,
        loading,
        play
    }), [canPlay, loading, play]);
};

module.exports = usePlayOnTvSession;
