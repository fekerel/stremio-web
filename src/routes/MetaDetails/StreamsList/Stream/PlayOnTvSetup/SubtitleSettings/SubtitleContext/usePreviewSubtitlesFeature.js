// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const { useToast } = require('stremio/common');
const { useStremoteRequest } = require('stremio/common/StremoteServer');

const SUBTITLE_ADDON_TRANSPORT_URL = 'https://opensubtitles-v3.strem.io/manifest.json';
const AVAILABLE_SUBTITLES_PATH = '/api/subtitles/discover';

const normalizeAvailableSubtitles = (subtitlesByLanguage) => {
    if (subtitlesByLanguage === null || typeof subtitlesByLanguage !== 'object') {
        return [];
    }

    return Object.values(subtitlesByLanguage)
        .filter(Array.isArray)
        .flat()
        .filter((subtitle) => subtitle !== null && typeof subtitle === 'object')
        .filter((subtitle) => typeof subtitle.id === 'string' && typeof subtitle.url === 'string')
        .map((subtitle) => ({
            id: subtitle.id,
            url: subtitle.url
        }));
};

const usePreviewSubtitlesFeature = (videoId) => {
    const toast = useToast();
    const requestAvailableSubtitles = useStremoteRequest();

    const [availableSubtitles, setAvailableSubtitles] = React.useState([]);
    const [availableSubtitlesStatus, setAvailableSubtitlesStatus] = React.useState('idle');
    const [availableSubtitlesError, setAvailableSubtitlesError] = React.useState(null);
    const [selectedSubtitleId, setSelectedSubtitleId] = React.useState(null);

    const selectedSubtitle = React.useMemo(() => {
        return availableSubtitles.find((subtitle) => subtitle.id === selectedSubtitleId) || null;
    }, [availableSubtitles, selectedSubtitleId]);

    const selectSubtitle = React.useCallback((subtitleId) => {
        setSelectedSubtitleId(subtitleId);
    }, []);

    const loadAvailableSubtitles = React.useCallback(() => {
        if (typeof videoId !== 'string' || videoId.length === 0) {
            const error = new Error('Video id is missing');

            setAvailableSubtitlesStatus('error');
            setAvailableSubtitlesError(error);
            toast.show({
                type: 'error',
                title: 'Failed to load subtitles',
                message: error.message,
                timeout: 4000
            });

            return Promise.reject(error);
        }

        setAvailableSubtitlesStatus('loading');
        setAvailableSubtitlesError(null);

        return requestAvailableSubtitles(AVAILABLE_SUBTITLES_PATH, {
            method: 'POST',
            headers: {
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                subtitleAddonTransportUrl: SUBTITLE_ADDON_TRANSPORT_URL,
                type: 'series',
                videoId
            })
        }, {
            concurrency: 'latest',
            onSuccess: (subtitlesByLanguage) => {
                const subtitles = normalizeAvailableSubtitles(subtitlesByLanguage);

                setAvailableSubtitles(subtitles);
                setSelectedSubtitleId((selectedSubtitleId) => {
                    return subtitles.some((subtitle) => subtitle.id === selectedSubtitleId) ?
                        selectedSubtitleId
                        :
                        null;
                });
                setAvailableSubtitlesStatus('ready');
            },
            onError: (error) => {
                setAvailableSubtitlesError(error);
                setAvailableSubtitlesStatus('error');
                toast.show({
                    type: 'error',
                    title: 'Failed to load subtitles',
                    message: error.message,
                    timeout: 4000
                });
            }
        });
    }, [requestAvailableSubtitles, toast, videoId]);

    return React.useMemo(() => ({
        availableSubtitles,
        availableSubtitlesStatus,
        availableSubtitlesError,
        selectedSubtitle,
        selectedSubtitleId,
        loadAvailableSubtitles,
        selectSubtitle
    }), [
        availableSubtitles,
        availableSubtitlesStatus,
        availableSubtitlesError,
        selectedSubtitle,
        selectedSubtitleId,
        loadAvailableSubtitles,
        selectSubtitle
    ]);
};

module.exports = usePreviewSubtitlesFeature;
