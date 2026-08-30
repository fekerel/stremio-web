// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { default: Icon } = require('@stremio/stremio-icons/react');
const { MediaPlayer, MediaOutlet } = require('@vidstack/react');
const Hls = require('hls.js');
const { useToast } = require('stremio/common');
const { API_BASE_URL } = require('stremio/common/config');
const { request: requestApi } = require('stremio/common/apiClient');
const { Button, ModalDialog, SearchBar, TextInput } = require('stremio/components');
const styles = require('./styles');

const SHIFT_DIRECTION_EARLY = 'early';
const SHIFT_DIRECTION_DELAYED = 'delayed';
const PREVIEW_POLL_INTERVAL = 1500;
const PREVIEW_TIME_SYNC_INTERVAL = 100;
const STREAMABLE_CLIP_STATUSES = ['streamable', 'ready'];
const PENDING_PREVIEW_STATUSES = ['queued', 'encoding'];
const TERMINAL_PREVIEW_STATUSES = ['ready', 'failed', 'canceled'];
const PLAYABLE_CLIP_STATUSES = ['streamable', 'ready'];
const HLS_CONFIG = {
    enableWorker: false,
};

const isResourcePath = (path) => {
    return typeof path === 'string' &&
        path.trim().length > 0 &&
        path !== 'undefined' &&
        path !== 'null';
};

const resolveApiResourceUrl = (path) => {
    if (!isResourcePath(path)) {
        return null;
    }

    try {
        return new URL(path).toString();
    } catch (_error) {
        const apiBaseUrl = new URL(API_BASE_URL);
        return path.startsWith('/') ?
            new URL(path, `${apiBaseUrl.protocol}//${apiBaseUrl.host}`).toString()
            :
            new URL(path, API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`).toString();
    }
};

const normalizeSubtitleOptions = (subtitlesByLanguage) => {
    if (typeof subtitlesByLanguage !== 'object' || subtitlesByLanguage === null) {
        return [];
    }

    return Object.entries(subtitlesByLanguage)
        .map(([language, subtitles]) => {
            const subtitle = Array.isArray(subtitles) ?
                subtitles.find((subtitle) => typeof subtitle?.id === 'string' && typeof subtitle?.url === 'string')
                :
                null;

            return subtitle ?
                {
                    ...subtitle,
                    lang: subtitle.lang || language,
                }
                :
                null;
        })
        .filter((subtitle) => subtitle !== null);
};

const getStreamFilename = (stream) => {
    return stream?.behaviorHints?.filename || stream?.deepLinks?.externalPlayer?.fileName;
};

const getSubtitleKey = (subtitle) => {
    return `${subtitle.lang || subtitle.language}:${subtitle.id}`;
};

const getSubtitleLanguage = (subtitle) => {
    return subtitle?.language || subtitle?.lang || 'und';
};

const getSubtitleLabel = (subtitle) => {
    return subtitle?.label || [getSubtitleLanguage(subtitle), subtitle?.id].filter(Boolean).join(' - ');
};

const getPreviewSubtitleStatus = (previewSubtitle) => {
    return previewSubtitle?.status || 'queued';
};

const isClipStreamable = (clip) => {
    return STREAMABLE_CLIP_STATUSES.includes(clip?.status);
};

const isClipPlayable = (clip) => {
    return PLAYABLE_CLIP_STATUSES.includes(clip?.status);
};

const clipNeedsPolling = (clip) => {
    return PENDING_PREVIEW_STATUSES.includes(clip?.status) ||
        !TERMINAL_PREVIEW_STATUSES.includes(clip?.status);
};

const getShiftMs = (shiftSeconds, shiftDirection) => {
    const value = Number.parseFloat(String(shiftSeconds).replace(',', '.'));
    const amount = Number.isFinite(value) ? Math.abs(value) : 0;
    const shiftMs = Math.round(amount * 1000);
    return shiftDirection === SHIFT_DIRECTION_EARLY ? -shiftMs : shiftMs;
};

const parseVttTimestamp = (value) => {
    const parts = value.replace(',', '.').split(':').map(Number);
    if (parts.some((part) => !Number.isFinite(part))) {
        return null;
    }

    if (parts.length === 3) {
        return Math.round(((parts[0] * 60 * 60) + (parts[1] * 60) + parts[2]) * 1000);
    }

    if (parts.length === 2) {
        return Math.round(((parts[0] * 60) + parts[1]) * 1000);
    }

    return null;
};

const parseVttCues = (vttText) => {
    return String(vttText)
        .replace(/\r\n/g, '\n')
        .split(/\n\n+/)
        .map((block) => block.split('\n').filter((line) => line.trim().length > 0))
        .map((lines) => {
            const timingLineIndex = lines.findIndex((line) => line.includes('-->'));
            if (timingLineIndex === -1) {
                return null;
            }

            const timingLine = lines[timingLineIndex];
            const [startValue, endAndSettings] = timingLine.split(/\s+-->\s+/);
            const endMatch = typeof endAndSettings === 'string' ? endAndSettings.match(/^(\S+)(.*)$/) : null;
            const startMs = parseVttTimestamp(startValue);
            const endMs = endMatch ? parseVttTimestamp(endMatch[1]) : null;
            if (startMs === null || endMs === null) {
                return null;
            }

            return {
                startMs,
                endMs,
                settings: endMatch[2] || '',
                text: lines.slice(timingLineIndex + 1).join('\n'),
            };
        })
        .filter((cue) => cue !== null);
};

const getClipPreviewCues = (cues, clip, shiftMs) => {
    if (!clip) {
        return [];
    }

    const clipStartMs = clip.positionSeconds * 1000;
    const clipDurationMs = clip.durationSeconds * 1000;
    return cues
        .map((cue) => {
            const shiftedStartMs = cue.startMs - clipStartMs + shiftMs;
            const shiftedEndMs = cue.endMs - clipStartMs + shiftMs;
            return {
                ...cue,
                startMs: Math.max(0, shiftedStartMs),
                endMs: Math.min(clipDurationMs, shiftedEndMs),
            };
        })
        .filter((cue) => cue.endMs > cue.startMs);
};

const getActivePreviewCues = (cues, currentTimeSeconds) => {
    const currentTimeMs = currentTimeSeconds * 1000;
    return cues.filter((cue) => cue.startMs <= currentTimeMs && cue.endMs > currentTimeMs);
};

const formatTime = (seconds) => {
    if (!Number.isFinite(seconds)) {
        return '00:00';
    }

    const totalSeconds = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const remainingSeconds = totalSeconds % 60;
    return hours > 0 ?
        `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
        :
        `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
};

const createPreviewSubtitlePayload = (subtitle) => ({
    url: subtitle.url,
    language: getSubtitleLanguage(subtitle),
    label: getSubtitleLabel(subtitle),
});

const ignoreMediaRequestError = () => null;

const getHlsConstructor = () => {
    if (typeof Hls === 'function' && Hls.Events) {
        return Hls;
    }

    if (typeof Hls?.default === 'function' && Hls.default.Events) {
        return Hls.default;
    }

    if (typeof Hls?.Hls === 'function' && Hls.Hls.Events) {
        return Hls.Hls;
    }

    return null;
};

const setLocalHlsLibrary = (provider) => {
    const HlsConstructor = getHlsConstructor();
    if (provider?.type === 'hls' && HlsConstructor) {
        provider.library = HlsConstructor;
        provider.config = {
            ...provider.config,
            ...HLS_CONFIG,
        };
    }
};

const isPreviewSessionResponse = (response) => {
    return typeof response?.id === 'string' &&
        (Array.isArray(response.clips) || Array.isArray(response.subtitles));
};

const findPreviewSubtitle = (preview, subtitle) => {
    if (!Array.isArray(preview?.subtitles) || !subtitle) {
        return null;
    }

    const language = getSubtitleLanguage(subtitle);
    const byUrl = preview.subtitles.find((previewSubtitle) => (
        previewSubtitle.url === subtitle.url &&
        (previewSubtitle.language || previewSubtitle.lang || 'und') === language
    ));

    return byUrl || preview.subtitles.find((previewSubtitle) => (
        (previewSubtitle.language || previewSubtitle.lang || 'und') === language
    )) || null;
};

const shouldPollPreview = (preview, selectedSubtitle) => {
    if (!preview?.id) {
        return false;
    }

    const clips = Array.isArray(preview.clips) ? preview.clips : [];
    if (!clips.some(isClipPlayable) && clips.some(clipNeedsPolling)) {
        return true;
    }

    if (selectedSubtitle) {
        const previewSubtitle = findPreviewSubtitle(preview, selectedSubtitle);
        return getPreviewSubtitleStatus(previewSubtitle) !== 'ready' &&
            getPreviewSubtitleStatus(previewSubtitle) !== 'failed' &&
            getPreviewSubtitleStatus(previewSubtitle) !== 'canceled';
    }

    return false;
};

const SubtitlePreviewModal = ({ request, onCloseRequest }) => {
    const toast = useToast();
    const playerRef = React.useRef(null);
    const mountedRef = React.useRef(false);
    const previewRequestIdRef = React.useRef(0);
    const subtitleDiscoveryRequestIdRef = React.useRef(0);
    const subtitleAddRequestIdRef = React.useRef(0);
    const resumeAfterSubtitleReadyRef = React.useRef(false);
    const loggedPlayerErrorsRef = React.useRef(new Set());
    const previewTimeSyncIntervalRef = React.useRef(null);
    const [previewStatus, setPreviewStatus] = React.useState('loading');
    const [previewSession, setPreviewSession] = React.useState(null);
    const [selectedClipId, setSelectedClipId] = React.useState(null);
    const [previewCurrentTimeSeconds, setPreviewCurrentTimeSeconds] = React.useState(0);
    const [subtitlesStatus, setSubtitlesStatus] = React.useState('idle');
    const [subtitleOptions, setSubtitleOptions] = React.useState([]);
    const [selectedSubtitleKey, setSelectedSubtitleKey] = React.useState(null);
    const [subtitleSearch, setSubtitleSearch] = React.useState('');
    const [previewSubtitleStatus, setPreviewSubtitleStatus] = React.useState('idle');
    const [previewSubtitleCues, setPreviewSubtitleCues] = React.useState([]);
    const [subtitleShiftDirection, setSubtitleShiftDirection] = React.useState(SHIFT_DIRECTION_DELAYED);
    const [subtitleShiftSeconds, setSubtitleShiftSeconds] = React.useState('0');
    const [previewPaused, setPreviewPaused] = React.useState(true);

    const selectedSubtitle = React.useMemo(() => {
        return subtitleOptions.find((subtitle) => getSubtitleKey(subtitle) === selectedSubtitleKey) || null;
    }, [subtitleOptions, selectedSubtitleKey]);

    const previewSubtitle = React.useMemo(() => {
        return findPreviewSubtitle(previewSession, selectedSubtitle);
    }, [previewSession, selectedSubtitle]);
    const previewSubtitleReadiness = getPreviewSubtitleStatus(previewSubtitle);
    const previewSubtitleUrl = previewSubtitle?.subtitleUrl;

    const selectedClip = React.useMemo(() => {
        const clips = Array.isArray(previewSession?.clips) ? previewSession.clips : [];
        return clips.find((clip) => clip.id === selectedClipId) ||
            clips.find(isClipPlayable) ||
            clips.find(isClipStreamable) ||
            clips[0] ||
            null;
    }, [previewSession, selectedClipId]);

    const filteredSubtitleOptions = React.useMemo(() => {
        const query = subtitleSearch.trim().toLowerCase();
        if (query.length === 0) {
            return subtitleOptions;
        }

        return subtitleOptions.filter((subtitle) => (
            [
                subtitle.lang,
                subtitle.language,
                subtitle.id,
                subtitle.url
            ]
                .filter((value) => typeof value === 'string')
                .join(' ')
                .toLowerCase()
                .includes(query)
        ));
    }, [subtitleOptions, subtitleSearch]);

    const selectedClipPlayable = isClipPlayable(selectedClip);
    const selectedClipUrl = selectedClipPlayable ? resolveApiResourceUrl(selectedClip.playlistUrl) : null;
    const shiftMs = getShiftMs(subtitleShiftSeconds, subtitleShiftDirection);
    const clipPreviewCues = React.useMemo(() => {
        return previewSubtitleStatus === 'ready' && selectedSubtitle ?
            getClipPreviewCues(previewSubtitleCues, selectedClip, shiftMs)
            :
            [];
    }, [previewSubtitleStatus, selectedSubtitle, previewSubtitleCues, selectedClip, shiftMs]);
    const activePreviewCues = React.useMemo(() => {
        return getActivePreviewCues(clipPreviewCues, previewCurrentTimeSeconds);
    }, [clipPreviewCues, previewCurrentTimeSeconds]);

    const configureProvider = React.useCallback((event) => {
        setLocalHlsLibrary(event.detail);
    }, []);

    const configureProviderLoader = React.useCallback((event) => {
        const loader = event.detail;
        if (!loader || loader.latcLocalHlsConfigured === true || typeof loader.load !== 'function') {
            return;
        }

        const originalLoad = loader.load.bind(loader);
        loader.load = async (context) => {
            const provider = await originalLoad(context);
            setLocalHlsLibrary(provider);
            return provider;
        };
        loader.latcLocalHlsConfigured = true;
    }, []);

    const syncPreviewCurrentTime = React.useCallback(() => {
        const player = playerRef.current;
        setPreviewCurrentTimeSeconds(player?.currentTime || 0);
    }, []);

    const stopPreviewTimeSync = React.useCallback(() => {
        if (previewTimeSyncIntervalRef.current !== null) {
            clearInterval(previewTimeSyncIntervalRef.current);
            previewTimeSyncIntervalRef.current = null;
        }
    }, []);

    const startPreviewTimeSync = React.useCallback(() => {
        if (previewTimeSyncIntervalRef.current !== null) {
            return;
        }

        syncPreviewCurrentTime();
        previewTimeSyncIntervalRef.current = setInterval(syncPreviewCurrentTime, PREVIEW_TIME_SYNC_INTERVAL);
    }, [syncPreviewCurrentTime]);

    const playerTimeUpdate = React.useCallback((event) => {
        const player = playerRef.current;
        setPreviewCurrentTimeSeconds(event.detail?.currentTime || player?.currentTime || 0);
    }, []);

    const playerPlay = React.useCallback(() => {
        setPreviewPaused(false);
        startPreviewTimeSync();
    }, [startPreviewTimeSync]);

    const playerPause = React.useCallback(() => {
        setPreviewPaused(true);
        stopPreviewTimeSync();
        syncPreviewCurrentTime();
    }, [stopPreviewTimeSync, syncPreviewCurrentTime]);

    const playerError = React.useCallback((event) => {
        const errorKey = JSON.stringify({
            code: event.detail?.code,
            message: event.detail?.message,
            mediaErrorMessage: event.detail?.mediaError?.message,
            selectedClipUrl,
        });
        if (loggedPlayerErrorsRef.current.has(errorKey)) {
            return;
        }

        loggedPlayerErrorsRef.current.add(errorKey);
        console.warn('LATC preview player error', {
            error: event.detail,
            clip: selectedClip,
            selectedClipUrl,
        });
    }, [selectedClip, selectedClipUrl]);

    const hlsError = React.useCallback((event) => {
        const detail = event.detail;
        const errorKey = JSON.stringify({
            type: detail?.type,
            details: detail?.details,
            fatal: detail?.fatal,
            errorMessage: detail?.error?.message,
            selectedClipUrl,
        });
        if (loggedPlayerErrorsRef.current.has(errorKey)) {
            return;
        }

        loggedPlayerErrorsRef.current.add(errorKey);
        console.warn('LATC preview HLS error', {
            detail,
            clip: selectedClip,
            selectedClipUrl,
        });
    }, [selectedClip, selectedClipUrl]);

    const pausePreview = React.useCallback(() => {
        const player = playerRef.current;
        if (player && typeof player.pause === 'function') {
            player.pause().catch(ignoreMediaRequestError);
        }
    }, []);

    const playPreview = React.useCallback(() => {
        const player = playerRef.current;
        if (player && typeof player.play === 'function') {
            player.play().catch(ignoreMediaRequestError);
        }
    }, []);

    const togglePreviewPlayback = React.useCallback(() => {
        if (previewPaused) {
            playPreview();
        } else {
            pausePreview();
        }
    }, [previewPaused, playPreview, pausePreview]);

    const restartPreview = React.useCallback(() => {
        const player = playerRef.current;
        if (player) {
            player.currentTime = 0;
            setPreviewCurrentTimeSeconds(0);
        }
    }, []);

    const selectClip = React.useCallback((clip) => () => {
        if (!isClipPlayable(clip)) {
            return;
        }

        setSelectedClipId(clip.id);
        setPreviewCurrentTimeSeconds(0);
        setPreviewPaused(true);
        loggedPlayerErrorsRef.current.clear();
    }, []);

    const subtitleSearchOnChange = React.useCallback((event) => {
        setSubtitleSearch(event.target.value);
    }, []);

    const subtitleShiftSecondsOnChange = React.useCallback((event) => {
        setSubtitleShiftSeconds(event.currentTarget.value);
    }, []);

    const setSubtitleShiftEarly = React.useCallback(() => {
        setSubtitleShiftDirection(SHIFT_DIRECTION_EARLY);
    }, []);

    const setSubtitleShiftDelayed = React.useCallback(() => {
        setSubtitleShiftDirection(SHIFT_DIRECTION_DELAYED);
    }, []);

    const selectSubtitle = React.useCallback((subtitle) => () => {
        if (!previewSession?.id) {
            return;
        }

        const player = playerRef.current;
        resumeAfterSubtitleReadyRef.current = Boolean(player && player.paused === false);
        pausePreview();
        setSelectedSubtitleKey(getSubtitleKey(subtitle));
        setPreviewSubtitleStatus('loading');
        setPreviewSubtitleCues([]);

        const requestId = subtitleAddRequestIdRef.current + 1;
        subtitleAddRequestIdRef.current = requestId;

        requestApi(`/previews/${encodeURIComponent(previewSession.id)}/subtitles`, {
            method: 'POST',
            body: JSON.stringify(createPreviewSubtitlePayload(subtitle)),
        })
            .then((response) => {
                if (!mountedRef.current || subtitleAddRequestIdRef.current !== requestId) {
                    return;
                }

                if (isPreviewSessionResponse(response)) {
                    setPreviewSession(response);
                }
            })
            .catch((error) => {
                if (!mountedRef.current || subtitleAddRequestIdRef.current !== requestId) {
                    return;
                }

                setPreviewSubtitleStatus('error');
                resumeAfterSubtitleReadyRef.current = false;
                toast.show({
                    type: 'error',
                    title: error.message || 'Preview altyazisi hazirlanamadi',
                    timeout: 4000,
                });
            });
    }, [previewSession?.id, pausePreview, toast]);

    React.useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            previewRequestIdRef.current += 1;
            subtitleDiscoveryRequestIdRef.current += 1;
            subtitleAddRequestIdRef.current += 1;
            stopPreviewTimeSync();
        };
    }, [stopPreviewTimeSync]);

    React.useEffect(() => {
        const player = playerRef.current;
        if (!player) {
            return undefined;
        }

        player.addEventListener('provider-change', configureProvider);
        player.addEventListener('provider-loader-change', configureProviderLoader);
        player.addEventListener('hls-error', hlsError);
        player.addEventListener('time-update', playerTimeUpdate);
        player.addEventListener('play', playerPlay);
        player.addEventListener('pause', playerPause);

        return () => {
            player.removeEventListener('provider-change', configureProvider);
            player.removeEventListener('provider-loader-change', configureProviderLoader);
            player.removeEventListener('hls-error', hlsError);
            player.removeEventListener('time-update', playerTimeUpdate);
            player.removeEventListener('play', playerPlay);
            player.removeEventListener('pause', playerPause);
        };
    });

    React.useEffect(() => {
        const requestId = previewRequestIdRef.current + 1;
        previewRequestIdRef.current = requestId;
        setPreviewStatus('loading');
        setPreviewSession(null);
        setSelectedClipId(null);
        setPreviewCurrentTimeSeconds(0);
        setPreviewPaused(true);
        stopPreviewTimeSync();
        loggedPlayerErrorsRef.current.clear();

        if (!request?.sourceUrl) {
            setPreviewStatus('error');
            return undefined;
        }

        let canceled = false;
        requestApi('/previews', {
            method: 'POST',
            body: JSON.stringify({
                sourceUrl: request.sourceUrl,
            }),
        })
            .then((response) => {
                if (canceled || !mountedRef.current || previewRequestIdRef.current !== requestId) {
                    return;
                }

                setPreviewSession(response);
                setPreviewStatus('ready');
            })
            .catch((error) => {
                if (canceled || !mountedRef.current || previewRequestIdRef.current !== requestId) {
                    return;
                }

                setPreviewStatus('error');
                toast.show({
                    type: 'error',
                    title: error.message || 'Preview baslatilamadi',
                    timeout: 4000,
                });
            });

        return () => {
            canceled = true;
        };
    }, [request?.sourceUrl, stopPreviewTimeSync, toast]);

    React.useEffect(() => {
        const requestId = subtitleDiscoveryRequestIdRef.current + 1;
        subtitleDiscoveryRequestIdRef.current = requestId;
        setSubtitlesStatus('loading');
        setSubtitleOptions([]);
        setSelectedSubtitleKey(null);
        setPreviewSubtitleStatus('idle');
        setPreviewSubtitleCues([]);

        if (!request?.subtitleAddonTransportUrl) {
            setSubtitlesStatus('missing');
            return;
        }

        requestApi('/subtitles/discover', {
            method: 'POST',
            body: JSON.stringify({
                subtitleAddonTransportUrl: request.subtitleAddonTransportUrl,
                type: request.type,
                videoId: request.videoId,
                sourceUrl: request.sourceUrl,
                videoHash: request.stream?.behaviorHints?.videoHash,
                videoSize: request.stream?.behaviorHints?.videoSize,
                filename: getStreamFilename(request.stream),
            }),
        })
            .then((response) => {
                if (!mountedRef.current || subtitleDiscoveryRequestIdRef.current !== requestId) {
                    return;
                }

                const options = normalizeSubtitleOptions(response);
                setSubtitleOptions(options);
                setSubtitlesStatus(options.length === 0 ? 'empty' : 'ready');
            })
            .catch(() => {
                if (!mountedRef.current || subtitleDiscoveryRequestIdRef.current !== requestId) {
                    return;
                }

                setSubtitlesStatus('error');
            });
    }, [request]);

    React.useEffect(() => {
        if (!shouldPollPreview(previewSession, selectedSubtitle)) {
            return undefined;
        }

        let canceled = false;
        const timeout = setTimeout(() => {
            requestApi(`/previews/${encodeURIComponent(previewSession.id)}`)
                .then((response) => {
                    if (!canceled && mountedRef.current) {
                        setPreviewSession(response);
                        setPreviewStatus('ready');
                    }
                })
                .catch(() => {
                    if (!canceled && mountedRef.current) {
                        setPreviewStatus('error');
                    }
                });
        }, PREVIEW_POLL_INTERVAL);

        return () => {
            canceled = true;
            clearTimeout(timeout);
        };
    }, [previewSession, selectedSubtitle]);

    React.useEffect(() => {
        if (!selectedSubtitle) {
            setPreviewSubtitleStatus('idle');
            setPreviewSubtitleCues([]);
            resumeAfterSubtitleReadyRef.current = false;
            return undefined;
        }

        if (!previewSubtitle) {
            setPreviewSubtitleStatus('loading');
            return undefined;
        }

        if (previewSubtitleReadiness === 'failed' || previewSubtitleReadiness === 'canceled') {
            setPreviewSubtitleStatus('error');
            resumeAfterSubtitleReadyRef.current = false;
            return undefined;
        }

        if (previewSubtitleReadiness !== 'ready' || !previewSubtitleUrl) {
            setPreviewSubtitleStatus('loading');
            return undefined;
        }

        const subtitleUrl = resolveApiResourceUrl(previewSubtitleUrl);
        if (!subtitleUrl) {
            setPreviewSubtitleStatus('error');
            resumeAfterSubtitleReadyRef.current = false;
            return undefined;
        }

        let canceled = false;
        setPreviewSubtitleStatus('loading');

        fetch(subtitleUrl)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(response.statusText);
                }

                return response.text();
            })
            .then((vttText) => {
                if (canceled || !mountedRef.current) {
                    return;
                }

                setPreviewSubtitleCues(parseVttCues(vttText));
                setPreviewSubtitleStatus('ready');
            })
            .catch(() => {
                if (canceled || !mountedRef.current) {
                    return;
                }

                setPreviewSubtitleStatus('error');
                resumeAfterSubtitleReadyRef.current = false;
            });

        return () => {
            canceled = true;
        };
    }, [selectedSubtitle, previewSubtitleReadiness, previewSubtitleUrl]);

    React.useEffect(() => {
        if (
            previewSubtitleStatus === 'ready' &&
            selectedClipPlayable &&
            resumeAfterSubtitleReadyRef.current
        ) {
            resumeAfterSubtitleReadyRef.current = false;
            playPreview();
        }
    }, [previewSubtitleStatus, selectedClipPlayable, playPreview]);

    const buttons = React.useMemo(() => ([
        {
            label: 'Kapat',
            props: {
                onClick: onCloseRequest,
            },
        }
    ]), [onCloseRequest]);
    const clips = Array.isArray(previewSession?.clips) ? previewSession.clips : [];
    const previewCurrentTimeLabel = selectedClip ?
        formatTime(selectedClip.positionSeconds + previewCurrentTimeSeconds)
        :
        null;

    return (
        <ModalDialog className={styles['subtitle-preview-modal-container']} title={'Altyazi preview'} buttons={buttons} onCloseRequest={onCloseRequest}>
            <div className={styles['content']}>
                <div className={styles['stream-summary']} title={request?.stream?.description || request?.sourceUrl}>
                    {request?.stream?.description || request?.sourceUrl}
                </div>
                <div className={styles['layout']}>
                    <section className={styles['section']}>
                        <div className={styles['section-title']}>{'Altyazi'}</div>
                        {
                            subtitlesStatus === 'loading' ?
                                <div className={styles['status']}>{'Altyazilar yukleniyor...'}</div>
                                :
                                subtitlesStatus === 'missing' ?
                                    <div className={styles['status']}>{'Altyazi addonu bulunamadi'}</div>
                                    :
                                    subtitlesStatus === 'error' ?
                                        <div className={styles['status']}>{'Altyazilar alinamadi'}</div>
                                        :
                                        subtitlesStatus === 'empty' ?
                                            <div className={styles['status']}>{'Altyazi bulunamadi'}</div>
                                            :
                                            <React.Fragment>
                                                <SearchBar
                                                    className={styles['search-bar']}
                                                    title={'Altyazi ara'}
                                                    value={subtitleSearch}
                                                    onChange={subtitleSearchOnChange}
                                                />
                                                <div className={styles['subtitles-list']}>
                                                    {
                                                        filteredSubtitleOptions.length === 0 ?
                                                            <div className={styles['status']}>{'Sonuc bulunamadi'}</div>
                                                            :
                                                            filteredSubtitleOptions.map((subtitle) => (
                                                                <Button
                                                                    key={getSubtitleKey(subtitle)}
                                                                    className={classnames(styles['option'], { selected: selectedSubtitleKey === getSubtitleKey(subtitle) })}
                                                                    title={getSubtitleLabel(subtitle)}
                                                                    onClick={selectSubtitle(subtitle)}
                                                                >
                                                                    <Icon className={styles['option-icon']} name={'subtitles'} />
                                                                    <div className={styles['option-info']}>
                                                                        <div className={styles['option-title']}>{getSubtitleLanguage(subtitle)}</div>
                                                                        <div className={styles['option-description']}>{subtitle.id}</div>
                                                                    </div>
                                                                </Button>
                                                            ))
                                                    }
                                                </div>
                                            </React.Fragment>
                        }
                    </section>
                    <section className={styles['section']}>
                        <div className={styles['preview-header']}>
                            <div className={styles['section-title']}>{'Preview'}</div>
                        </div>
                        {
                            clips.length > 0 ?
                                <div className={styles['clips-list']}>
                                    {clips.map((clip) => {
                                        const playable = isClipPlayable(clip);
                                        return (
                                            <Button
                                                key={clip.id}
                                                className={classnames(styles['clip-option'], {
                                                    selected: selectedClip?.id === clip.id,
                                                    disabled: !playable,
                                                })}
                                                title={`${formatTime(clip.positionSeconds)} - ${clip.status}`}
                                                disabled={!playable}
                                                onClick={playable ? selectClip(clip) : undefined}
                                            >
                                                {formatTime(clip.positionSeconds)}
                                            </Button>
                                        );
                                    })}
                                </div>
                                :
                                null
                        }
                        <div className={styles['preview-video-container']}>
                            {
                                selectedClipUrl ?
                                    <MediaPlayer
                                        ref={playerRef}
                                        className={styles['preview-player']}
                                        src={{
                                            src: selectedClipUrl,
                                            type: 'application/x-mpegurl',
                                        }}
                                        viewType={'video'}
                                        streamType={'on-demand'}
                                        load={'eager'}
                                        preload={'auto'}
                                        controls={false}
                                        playsinline={true}
                                        preferNativeHLS={false}
                                        onProviderChange={configureProvider}
                                        onProviderLoaderChange={configureProviderLoader}
                                        onHlsError={hlsError}
                                        onTimeUpdate={playerTimeUpdate}
                                        onError={playerError}
                                    >
                                        <MediaOutlet />
                                    </MediaPlayer>
                                    :
                                    <div className={styles['preview-status']}>
                                        {
                                            previewStatus === 'error' ?
                                                'Preview hazirlanamadi'
                                                :
                                                selectedClip?.status === 'failed' || selectedClip?.status === 'canceled' ?
                                                    'Preview kesiti hazirlanamadi'
                                                    :
                                                    selectedClipPlayable && !selectedClipUrl ?
                                                        'Preview playlist URL bulunamadi'
                                                        :
                                                        'Preview hazirlaniyor...'
                                        }
                                    </div>
                            }
                            {
                                activePreviewCues.length > 0 ?
                                    <div className={styles['preview-captions']}>
                                        {activePreviewCues.map((cue, index) => (
                                            <div key={`${cue.startMs}:${cue.endMs}:${index}`} className={styles['preview-cue']}>
                                                {cue.text}
                                            </div>
                                        ))}
                                    </div>
                                    :
                                    null
                            }
                            {
                                selectedClipUrl ?
                                    <div className={styles['preview-controls']}>
                                        <Button
                                            className={styles['preview-control-button']}
                                            title={previewPaused ? 'Oynat' : 'Duraklat'}
                                            onClick={togglePreviewPlayback}
                                        >
                                            <Icon className={styles['preview-control-icon']} name={previewPaused ? 'play' : 'pause'} />
                                        </Button>
                                        <Button
                                            className={styles['preview-control-button']}
                                            title={'Basa sar'}
                                            onClick={restartPreview}
                                        >
                                            {'0:00'}
                                        </Button>
                                        {
                                            previewCurrentTimeLabel ?
                                                <div className={styles['preview-control-time']}>{previewCurrentTimeLabel}</div>
                                                :
                                                null
                                        }
                                    </div>
                                    :
                                    null
                            }
                        </div>
                        {
                            selectedSubtitle ?
                                <React.Fragment>
                                    <div className={styles['shift-direction-container']}>
                                        <Button
                                            className={classnames(styles['shift-direction-option'], { selected: subtitleShiftDirection === SHIFT_DIRECTION_EARLY })}
                                            title={'Altyazi erken gelsin'}
                                            onClick={setSubtitleShiftEarly}
                                        >
                                            {'Erken'}
                                        </Button>
                                        <Button
                                            className={classnames(styles['shift-direction-option'], { selected: subtitleShiftDirection === SHIFT_DIRECTION_DELAYED })}
                                            title={'Altyazi gec gelsin'}
                                            onClick={setSubtitleShiftDelayed}
                                        >
                                            {'Gecikmeli'}
                                        </Button>
                                    </div>
                                    <label className={styles['shift-container']}>
                                        <div className={styles['shift-label']}>{'Senkron (sn)'}</div>
                                        <TextInput
                                            className={styles['shift-input']}
                                            type={'text'}
                                            inputMode={'decimal'}
                                            value={subtitleShiftSeconds}
                                            onChange={subtitleShiftSecondsOnChange}
                                        />
                                    </label>
                                    {
                                        previewSubtitleStatus === 'loading' ?
                                            <div className={styles['status']}>{'Preview altyazisi hazirlaniyor...'}</div>
                                            :
                                            previewSubtitleStatus === 'error' ?
                                                <div className={styles['status']}>{'Preview altyazisi alinamadi'}</div>
                                                :
                                                null
                                    }
                                </React.Fragment>
                                :
                                <div className={styles['status']}>{'Preview uzerine eklemek icin altyazi secin'}</div>
                        }
                    </section>
                </div>
            </div>
        </ModalDialog>
    );
};

SubtitlePreviewModal.propTypes = {
    request: PropTypes.shape({
        type: PropTypes.string,
        videoId: PropTypes.string,
        sourceUrl: PropTypes.string,
        stream: PropTypes.object,
        subtitleAddonTransportUrl: PropTypes.string,
        subtitleAddonManifest: PropTypes.object,
    }),
    onCloseRequest: PropTypes.func
};

module.exports = SubtitlePreviewModal;
