// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const { useHttpRequest, useToast } = require('stremio/common');
const { useStremoteRequest } = require('stremio/common/StremoteServer');
const parseSubtitleCues = require('./parseSubtitleCues');

const SUBTITLE_ADDON_TRANSPORT_URL = 'https://opensubtitles-v3.strem.io/manifest.json';
const AVAILABLE_SUBTITLES_PATH = '/api/subtitles/discover';

const normalizeAvailableSubtitles = (subtitlesByLanguage) => {
    if (subtitlesByLanguage === null || typeof subtitlesByLanguage !== 'object') {
        return [];
    }

    return Object.entries(subtitlesByLanguage)
        .filter(([, subtitles]) => Array.isArray(subtitles))
        .flatMap(([language, subtitles]) => {
            return subtitles
                .filter((subtitle) => subtitle !== null && typeof subtitle === 'object')
                .filter((subtitle) => typeof subtitle.id === 'string' && typeof subtitle.url === 'string')
                .map((subtitle) => {
                    const lang = typeof subtitle.lang === 'string' ? subtitle.lang : language;

                    return {
                        id: subtitle.id,
                        key: `${lang}:${subtitle.id}:${subtitle.url}`,
                        url: subtitle.url,
                        lang
                    };
                });
        });
};

const usePreviewSubtitlesFeature = (videoId) => {
    const toast = useToast();
    const requestSubtitleText = useHttpRequest();
    const requestAvailableSubtitles = useStremoteRequest();

    const [availableSubtitles, setAvailableSubtitles] = React.useState([]);
    const [availableSubtitlesStatus, setAvailableSubtitlesStatus] = React.useState('idle');
    const [availableSubtitlesError, setAvailableSubtitlesError] = React.useState(null);
    const [selectedSubtitleKey, setSelectedSubtitleKey] = React.useState(null);
    const [subtitleDelay, setSubtitleDelay] = React.useState(0);
    const [subtitleCues, setSubtitleCues] = React.useState([]);
    const [subtitleCuesStatus, setSubtitleCuesStatus] = React.useState('idle');
    const [subtitleCuesError, setSubtitleCuesError] = React.useState(null);

    const selectedSubtitle = React.useMemo(() => {
        return availableSubtitles.find((subtitle) => subtitle.key === selectedSubtitleKey) || null;
    }, [availableSubtitles, selectedSubtitleKey]);

    const selectSubtitle = React.useCallback((subtitleKey) => {
        setSelectedSubtitleKey(subtitleKey);
        setSubtitleDelay(0);
    }, []);

    const loadSubtitleCues = React.useCallback((subtitle = selectedSubtitle) => {
        setSubtitleCues([]);
        setSubtitleCuesError(null);

        if (subtitle === null) {
            setSubtitleCuesStatus('idle');

            return Promise.resolve(null);
        }

        setSubtitleCuesStatus('loading');

        return requestSubtitleText(subtitle.url, {}, {
            concurrency: 'latest',
            responseType: 'text',
            onSuccess: (text) => {
                const cues = parseSubtitleCues(text);

                setSubtitleCues(cues);
                setSubtitleCuesStatus('ready');
            },
            onError: (error) => {
                setSubtitleCues([]);
                setSubtitleCuesError(error);
                setSubtitleCuesStatus('error');
            }
        }).catch(() => null);
    }, [requestSubtitleText, selectedSubtitle]);

    const shiftedSubtitleCues = React.useMemo(() => {
        return subtitleCues.map((cue) => ({
            ...cue,
            startTime: Math.max(0, cue.startTime + subtitleDelay),
            endTime: Math.max(0, cue.endTime + subtitleDelay),
        }));
    }, [subtitleCues, subtitleDelay]);

    React.useEffect(() => {
        loadSubtitleCues(selectedSubtitle);
    }, [loadSubtitleCues, selectedSubtitle]);

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
                setSelectedSubtitleKey((selectedSubtitleKey) => {
                    return subtitles.some((subtitle) => subtitle.key === selectedSubtitleKey) ?
                        selectedSubtitleKey
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
        selectedSubtitleKey,
        subtitleDelay,
        subtitleCues,
        shiftedSubtitleCues,
        subtitleCuesStatus,
        subtitleCuesError,
        setSubtitleDelay,
        loadSubtitleCues,
        loadAvailableSubtitles,
        selectSubtitle
    }), [
        availableSubtitles,
        availableSubtitlesStatus,
        availableSubtitlesError,
        selectedSubtitle,
        selectedSubtitleKey,
        subtitleDelay,
        subtitleCues,
        shiftedSubtitleCues,
        subtitleCuesStatus,
        subtitleCuesError,
        loadSubtitleCues,
        loadAvailableSubtitles,
        selectSubtitle
    ]);
};

module.exports = usePreviewSubtitlesFeature;
