// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const classnames = require('classnames');
const FocusLock = require('react-focus-lock').default;
const { default: Icon } = require('@stremio/stremio-icons/react');
const { Button } = require('stremio/components');
const { usePlatform, useStreamingServer } = require('stremio/common');
const PreciseSeekBar = require('./PreciseSeekBar');
const useVideo = require('stremio/routes/Player/useVideo');
const { useStreamInfo } = require('../../StreamInfoContext');
const { usePreviewSubtitles } = require('../SubtitleContext');
const styles = require('./styles');

const SUBTITLE_TRACK_ID_PREFIX = 'PREVIEW_SUBTITLE_';
const getSubtitleTrackId = (subtitle) => `${SUBTITLE_TRACK_ID_PREFIX}${subtitle.key}`;
const getSubtitleLabel = (subtitle) => subtitle.lang ? `${subtitle.lang} - ${subtitle.id}` : subtitle.id;
const getSubtitleLanguage = (subtitle) => subtitle.lang || 'unknown';
const getSubtitleOptionLabel = (subtitle, index) => {
    if (typeof subtitle.id === 'string' && subtitle.id.trim().length > 0) {
        return subtitle.id;
    }

    if (typeof subtitle.url === 'string' && subtitle.url.trim().length > 0) {
        return subtitle.url.split('/').pop() || subtitle.url;
    }

    return `Subtitle ${index + 1}`;
};
const getCueKey = (cue) => `${cue.startTime}-${cue.endTime}-${cue.text}`;
const isFiniteNumber = (value) => typeof value === 'number' && isFinite(value);

const clampDisplayTime = (time, duration) => {
    if (!isFiniteNumber(time)) {
        return null;
    }

    const nonNegativeTime = Math.max(0, time);

    return isFiniteNumber(duration) ?
        Math.min(nonNegativeTime, duration)
        :
        nonNegativeTime;
};

const readVideoElementTime = (containerElement) => {
    const videoElement = containerElement instanceof HTMLElement ?
        containerElement.querySelector('video')
        :
        null;

    return videoElement instanceof HTMLVideoElement && isFiniteNumber(videoElement.currentTime) ?
        videoElement.currentTime * 1000
        :
        null;
};

const readVideoElementBuffered = (containerElement) => {
    const videoElement = containerElement instanceof HTMLElement ?
        containerElement.querySelector('video')
        :
        null;

    if (!(videoElement instanceof HTMLVideoElement) || !isFiniteNumber(videoElement.currentTime)) {
        return null;
    }

    for (let i = 0; i < videoElement.buffered.length; i++) {
        if (videoElement.buffered.start(i) <= videoElement.currentTime && videoElement.currentTime <= videoElement.buffered.end(i)) {
            return Math.floor(videoElement.buffered.end(i) * 1000);
        }
    }

    return null;
};

const BufferedTime = ({ containerRef }) => {
    const [buffered, setBuffered] = React.useState(null);

    React.useEffect(() => {
        const update = () => {
            const nextBuffered = readVideoElementBuffered(containerRef.current);

            setBuffered((buffered) => {
                return buffered !== nextBuffered &&
                    (
                        !isFiniteNumber(buffered) ||
                        !isFiniteNumber(nextBuffered) ||
                        Math.abs(buffered - nextBuffered) >= 500
                    ) ?
                    nextBuffered
                    :
                    buffered;
            });
        };
        const interval = window.setInterval(update, 500);

        update();

        return () => {
            window.clearInterval(interval);
        };
    }, [containerRef]);

    return formatTime(buffered);
};

const formatTime = (time) => {
    if (typeof time !== 'number' || !isFinite(time)) {
        return '--:--';
    }

    const seconds = Math.floor(time / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    const parts = hours > 0 ?
        [hours, minutes, remainingSeconds]
        :
        [minutes, remainingSeconds];

    return parts
        .map((part, index) => index === 0 ? String(part) : String(part).padStart(2, '0'))
        .join(':');
};

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

const canLoadStream = (stream) => {
    return stream !== null && (
        typeof stream.url === 'string' ||
        typeof stream.infoHash === 'string'
    );
};

const SubtitlePreviewVideo = () => {
    const { stream, streamLink } = useStreamInfo();
    const {
        availableSubtitles,
        availableSubtitlesStatus,
        availableSubtitlesError,
        selectedSubtitle,
        selectedSubtitleKey,
        subtitleDelay,
        shiftedSubtitleCues,
        subtitleCuesStatus,
        subtitleCuesError,
        loadSubtitleCues,
        loadAvailableSubtitles,
        selectSubtitle,
        setSubtitleDelay
    } = usePreviewSubtitles();
    const streamingServer = useStreamingServer();
    const platform = usePlatform();
    const video = useVideo({
        ignoredObservedProps: ['time', 'buffered', 'buffering']
    });
    const cueRefs = React.useRef(new Map());
    const [error, setError] = React.useState(null);
    const [subtitlesMenuOpen, setSubtitlesMenuOpen] = React.useState(false);
    const [activeSubtitleLanguage, setActiveSubtitleLanguage] = React.useState(null);
    const [activeCueKey, setActiveCueKey] = React.useState(null);

    const streamingServerURL = React.useMemo(() => {
        return streamingServer.baseUrl && streamingServer.selected ?
            streamingServer.selected.transportUrl
            :
            null;
    }, [streamingServer.baseUrl, streamingServer.selected]);

    const playbackStream = React.useMemo(() => {
        return getPlaybackStream(stream, streamLink);
    }, [stream, streamLink]);

    const streamLoadable = React.useMemo(() => canLoadStream(playbackStream), [playbackStream]);

    React.useEffect(() => {
        setError(null);
        video.unload();

        if (!streamLoadable) {
            return;
        }

        video.load({
            stream: playbackStream,
            autoplay: false,
            time: 0,
            platform: platform.name,
            streamingServerURL,
            //videoCodecs: ['h264'],
            maxWidth: 640
        });
    }, [playbackStream, platform.name, streamLoadable, streamingServerURL]);

    React.useEffect(() => {
        if (selectedSubtitle === null || video.state.stream === null) {
            return;
        }

        const trackId = getSubtitleTrackId(selectedSubtitle);

        video.addExtraSubtitlesTracks([{
            id: trackId,
            url: selectedSubtitle.url,
            lang: selectedSubtitle.lang || 'preview',
            label: getSubtitleLabel(selectedSubtitle),
            origin: 'PREVIEW',
            embedded: false,
        }]);
        video.setExtraSubtitlesTrack(trackId);
        video.setSubtitlesOffset(8);
    }, [selectedSubtitle, video.state.stream]);

    React.useEffect(() => {
        if (selectedSubtitle === null || video.state.stream === null) {
            return;
        }

        video.setSubtitlesDelay(subtitleDelay);
    }, [selectedSubtitle, subtitleDelay, video.state.stream]);

    React.useEffect(() => {
        if (availableSubtitlesStatus === 'idle') {
            loadAvailableSubtitles().catch(() => null);
        }
    }, [availableSubtitlesStatus, loadAvailableSubtitles]);

    const getCueAtTime = React.useCallback((time) => {
        if (typeof time !== 'number' || !isFinite(time)) {
            return null;
        }

        return shiftedSubtitleCues.find((cue) => cue.startTime <= time && cue.endTime >= time) ||
            shiftedSubtitleCues.find((cue) => cue.startTime > time) ||
            shiftedSubtitleCues[shiftedSubtitleCues.length - 1] ||
            null;
    }, [shiftedSubtitleCues]);

    const readCurrentPlaybackTime = React.useCallback(() => {
        const videoElementTime = readVideoElementTime(video.containerRef.current);

        return clampDisplayTime(
            videoElementTime !== null ? videoElementTime : video.state.time,
            video.state.duration
        );
    }, [video.containerRef, video.state.duration, video.state.time]);

    const updateActiveCueKey = React.useCallback((time) => {
        const cue = getCueAtTime(time);
        const cueKey = cue !== null && cue.startTime <= time && cue.endTime >= time ?
            getCueKey(cue)
            :
            null;

        setActiveCueKey((activeCueKey) => activeCueKey === cueKey ? activeCueKey : cueKey);
    }, [getCueAtTime]);

    React.useEffect(() => {
        if (shiftedSubtitleCues.length === 0) {
            setActiveCueKey(null);
            return undefined;
        }

        const update = () => {
            const time = readCurrentPlaybackTime();

            updateActiveCueKey(time);
        };
        const interval = window.setInterval(update, 500);

        update();

        return () => {
            window.clearInterval(interval);
        };
    }, [readCurrentPlaybackTime, shiftedSubtitleCues.length, updateActiveCueKey]);

    const centerCueAtTime = React.useCallback((time) => {
        const cue = getCueAtTime(time);

        if (cue === null) {
            return;
        }

        const element = cueRefs.current.get(getCueKey(cue));

        if (element) {
            element.scrollIntoView({
                block: 'center',
                behavior: 'smooth'
            });
        }
    }, [getCueAtTime]);

    const shiftSubtitle = React.useCallback((offset) => {
        setSubtitleDelay((delay) => delay + offset);
    }, [setSubtitleDelay]);

    const togglePlayback = React.useCallback(() => {
        video.setPaused(video.state.paused === false);
    }, [video.state.paused]);

    const seek = React.useCallback((time) => {
        video.setTime(time);
        updateActiveCueKey(time);
        centerCueAtTime(time);
        window.setTimeout(() => centerCueAtTime(time), 120);
    }, [centerCueAtTime, updateActiveCueKey]);

    const centerCurrentCue = React.useCallback(() => {
        const currentTime = readCurrentPlaybackTime();

        if (isFiniteNumber(currentTime)) {
            centerCueAtTime(currentTime);
        }
    }, [centerCueAtTime, readCurrentPlaybackTime]);

    const toggleSubtitlesMenu = React.useCallback(() => {
        setSubtitlesMenuOpen((open) => !open);
    }, []);

    const closeSubtitlesMenu = React.useCallback(() => {
        setSubtitlesMenuOpen(false);
    }, []);

    const subtitlesMenuOnMouseDown = React.useCallback((event) => {
        event.stopPropagation();
    }, []);

    const subtitlesMenuOnKeyDown = React.useCallback((event) => {
        if (event.code === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            event.nativeEvent.stopImmediatePropagation();
            closeSubtitlesMenu();
        }
    }, [closeSubtitlesMenu]);

    const selectSubtitleFromMenu = React.useCallback((subtitleKey) => {
        selectSubtitle(subtitleKey);
        setSubtitlesMenuOpen(false);
    }, [selectSubtitle]);

    const clearSelectedSubtitle = React.useCallback(() => {
        video.setExtraSubtitlesTrack(null);
        selectSubtitle(null);
        setSubtitlesMenuOpen(false);
    }, [selectSubtitle]);

    const subtitlesByLanguage = React.useMemo(() => {
        return availableSubtitles.reduce((subtitlesByLanguage, subtitle) => {
            const language = getSubtitleLanguage(subtitle);

            if (!subtitlesByLanguage.has(language)) {
                subtitlesByLanguage.set(language, []);
            }

            subtitlesByLanguage.get(language).push(subtitle);

            return subtitlesByLanguage;
        }, new Map());
    }, [availableSubtitles]);

    const subtitleLanguages = React.useMemo(() => {
        return Array.from(subtitlesByLanguage.keys());
    }, [subtitlesByLanguage]);

    const selectedSubtitleLanguage = selectedSubtitle !== null ?
        getSubtitleLanguage(selectedSubtitle)
        :
        null;

    React.useEffect(() => {
        if (!subtitlesMenuOpen) {
            return;
        }

        if (subtitleLanguages.length === 0) {
            setActiveSubtitleLanguage(null);
            return;
        }

        if (activeSubtitleLanguage !== null && subtitleLanguages.includes(activeSubtitleLanguage)) {
            return;
        }

        setActiveSubtitleLanguage(
            selectedSubtitleLanguage !== null && subtitleLanguages.includes(selectedSubtitleLanguage) ?
                selectedSubtitleLanguage
                :
                subtitleLanguages[0]
        );
    }, [activeSubtitleLanguage, selectedSubtitleLanguage, subtitleLanguages, subtitlesMenuOpen]);

    const activeLanguageSubtitles = activeSubtitleLanguage !== null ?
        subtitlesByLanguage.get(activeSubtitleLanguage) || []
        :
        [];

    React.useEffect(() => {
        video.events.on('error', setError);

        return () => {
            video.events.off('error', setError);
        };
    }, [video.events]);

    const playbackLabel = video.state.paused === false ? 'Pause' : 'Play';
    const playbackIcon = video.state.paused === false ? 'pause' : 'play';
    const selectedTrackId = selectedSubtitle !== null ? getSubtitleTrackId(selectedSubtitle) : null;
    const extraSubtitleTrackIds = Array.isArray(video.state.extraSubtitlesTracks) ?
        video.state.extraSubtitlesTracks.map((track) => track.id)
        :
        [];
    const subtitleStatus = selectedSubtitle === null ?
        'No subtitle selected'
        :
        video.state.selectedExtraSubtitlesTrackId === selectedTrackId ?
            `Subtitle selected: ${getSubtitleLabel(selectedSubtitle)}`
            :
            extraSubtitleTrackIds.includes(selectedTrackId) ?
                `Subtitle pending selection: ${getSubtitleLabel(selectedSubtitle)}`
                :
                `Subtitle pending track: ${getSubtitleLabel(selectedSubtitle)}`;

    return (
        <div className={styles['subtitle-preview-container']}>
            <div className={styles['video-panel']}>
                <div className={styles['video-frame']}>
                    <div className={styles['video-inner']} ref={video.containerRef} />
                    <Button
                        className={classnames(styles['icon-button'], styles['subtitles-clear-button'], {
                            [styles['active']]: selectedSubtitle !== null
                        })}
                        title={'Turn off subtitles'}
                        disabled={selectedSubtitle === null}
                        onClick={clearSelectedSubtitle}
                    >
                        <Icon className={styles['icon']} name={'subtitles'} />
                    </Button>
                    <div className={styles['video-controls']}>
                        <Button
                            className={classnames(styles['icon-button'], styles['play-button'])}
                            title={playbackLabel}
                            disabled={!streamLoadable}
                            onClick={togglePlayback}
                        >
                            <Icon className={styles['icon']} name={playbackIcon} />
                        </Button>
                        <PreciseSeekBar
                            className={styles['video-seek']}
                            containerRef={video.containerRef}
                            time={video.state.time}
                            duration={video.state.duration}
                            buffered={video.state.buffered}
                            playbackSpeed={video.state.playbackSpeed || 1}
                            onSeekRequested={seek}
                        />
                        <Button
                            className={classnames(styles['icon-button'], styles['subtitles-button'], {
                                [styles['active']]: subtitlesMenuOpen
                            })}
                            title={'Choose subtitles'}
                            onClick={toggleSubtitlesMenu}
                        >
                            <Icon className={styles['icon']} name={'subtitles'} />
                        </Button>
                    </div>
                </div>
                {
                    subtitlesMenuOpen ?
                        <FocusLock
                            className={styles['subtitles-menu-layer']}
                            autoFocus={true}
                            returnFocus={true}
                            lockProps={{
                                onMouseDown: closeSubtitlesMenu,
                                onKeyDown: subtitlesMenuOnKeyDown
                            }}
                        >
                            <div
                                className={styles['subtitles-menu']}
                                role={'dialog'}
                                aria-modal={'true'}
                                aria-label={'External subtitles'}
                                onMouseDown={subtitlesMenuOnMouseDown}
                            >
                                <div className={styles['subtitles-menu-header']}>
                                    <div className={styles['subtitles-menu-title']}>External subtitles</div>
                                    <div className={styles['subtitles-menu-status']}>
                                        {availableSubtitlesStatus} - {availableSubtitles.length} found
                                    </div>
                                    <Button
                                        className={styles['subtitles-menu-close-button']}
                                        title={'Close subtitles'}
                                        onClick={closeSubtitlesMenu}
                                    >
                                        <Icon className={styles['icon']} name={'close'} />
                                    </Button>
                                </div>
                                {
                                    availableSubtitlesStatus === 'loading' ?
                                        <div className={styles['empty-state']}>Loading subtitles...</div>
                                        :
                                        availableSubtitlesError !== null ?
                                            <div className={styles['menu-error']} title={availableSubtitlesError.message}>
                                                <span>{availableSubtitlesError.message}</span>
                                                <Button
                                                    className={styles['retry-button']}
                                                    title={'Retry subtitles'}
                                                    onClick={() => loadAvailableSubtitles().catch(() => null)}
                                                >
                                                    Retry
                                                </Button>
                                            </div>
                                            :
                                            availableSubtitles.length > 0 ?
                                                <div className={styles['subtitles-selector']}>
                                                    <div className={styles['subtitle-languages-list']}>
                                                        {
                                                            subtitleLanguages.map((language) => {
                                                                const languageSubtitles = subtitlesByLanguage.get(language) || [];

                                                                return (
                                                                    <Button
                                                                        key={language}
                                                                        className={classnames(styles['subtitle-language-option'], {
                                                                            [styles['selected']]: activeSubtitleLanguage === language
                                                                        })}
                                                                        title={language}
                                                                        onClick={() => setActiveSubtitleLanguage(language)}
                                                                    >
                                                                        <span className={styles['subtitle-language-label']}>{language}</span>
                                                                        <span className={styles['subtitle-language-count']}>{languageSubtitles.length}</span>
                                                                    </Button>
                                                                );
                                                            })
                                                        }
                                                    </div>
                                                    <div className={styles['subtitles-options-list']}>
                                                        {
                                                            activeLanguageSubtitles.map((subtitle, index) => {
                                                                const label = getSubtitleOptionLabel(subtitle, index);

                                                                return (
                                                                    <Button
                                                                        key={subtitle.key}
                                                                        className={classnames(styles['subtitle-option'], {
                                                                            [styles['selected']]: selectedSubtitleKey === subtitle.key
                                                                        })}
                                                                        title={subtitle.url}
                                                                        onClick={() => selectSubtitleFromMenu(subtitle.key)}
                                                                    >
                                                                        <span className={styles['subtitle-option-label']}>{label}</span>
                                                                        <span className={styles['subtitle-option-url']}>{subtitle.url}</span>
                                                                        <span className={styles['subtitle-option-meta']}>
                                                                            {selectedSubtitleKey === subtitle.key ? 'Selected' : `#${index + 1}`}
                                                                        </span>
                                                                    </Button>
                                                                );
                                                            })
                                                        }
                                                    </div>
                                                </div>
                                                :
                                                <div className={styles['empty-state']}>No external subtitles loaded.</div>
                                }
                            </div>
                        </FocusLock>
                        :
                        null
                }
            </div>
            <div className={styles['shift-panel']}>
                <Button
                    className={classnames(styles['shift-button'], styles['shift-button-back'])}
                    title={'Shift subtitles backward by 1 second'}
                    disabled={!streamLoadable || selectedSubtitle === null}
                    onClick={() => shiftSubtitle(-1000)}
                >
                    -1s
                </Button>
                <Button
                    className={classnames(styles['shift-button'], styles['shift-button-back-small'])}
                    title={'Shift subtitles backward by 250 milliseconds'}
                    disabled={!streamLoadable || selectedSubtitle === null}
                    onClick={() => shiftSubtitle(-250)}
                >
                    -250ms
                </Button>
                <div className={styles['shift-value']}>
                    <div className={styles['shift-label']}>Shift</div>
                    <div className={styles['shift-time']}>{(subtitleDelay / 1000).toFixed(2)}s</div>
                </div>
                <Button
                    className={classnames(styles['shift-button'], styles['shift-button-forward-small'])}
                    title={'Shift subtitles forward by 250 milliseconds'}
                    disabled={!streamLoadable || selectedSubtitle === null}
                    onClick={() => shiftSubtitle(250)}
                >
                    +250ms
                </Button>
                <Button
                    className={classnames(styles['shift-button'], styles['shift-button-forward'])}
                    title={'Shift subtitles forward by 1 second'}
                    disabled={!streamLoadable || selectedSubtitle === null}
                    onClick={() => shiftSubtitle(1000)}
                >
                    +1s
                </Button>
            </div>
            <div className={styles['cues-panel']}>
                <div className={styles['cues-header']}>
                    <div className={styles['cues-title']}>
                        <div>Subtitle cues</div>
                        <div className={styles['cues-subtitle']}>
                            {subtitleCuesStatus} - {shiftedSubtitleCues.length} cues - Buffered <BufferedTime containerRef={video.containerRef} />
                        </div>
                    </div>
                    <Button
                        className={styles['center-button']}
                        title={'Center current cue'}
                        disabled={shiftedSubtitleCues.length === 0}
                        onClick={centerCurrentCue}
                    >
                        Current
                    </Button>
                </div>
                <div className={styles['subtitle-status']}>{subtitleStatus}</div>
                {
                    subtitleCuesError !== null ?
                        <div className={styles['error-state']} title={subtitleCuesError.message}>
                            {subtitleCuesError.message}
                            <Button
                                className={styles['retry-button']}
                                title={'Retry subtitle cues'}
                                disabled={subtitleCuesStatus === 'loading'}
                                onClick={() => loadSubtitleCues()}
                            >
                                Retry
                            </Button>
                        </div>
                        :
                        null
                }
                <div className={styles['cues-list']}>
                    {
                        shiftedSubtitleCues.length > 0 ?
                            shiftedSubtitleCues.map((cue) => {
                                const cueKey = getCueKey(cue);

                                return (
                                    <div
                                        key={cueKey}
                                        ref={(element) => {
                                            if (element) {
                                                cueRefs.current.set(cueKey, element);
                                            } else {
                                                cueRefs.current.delete(cueKey);
                                            }
                                        }}
                                        className={classnames(styles['cue-row'], {
                                            [styles['active']]: activeCueKey === cueKey
                                        })}
                                    >
                                        <div className={styles['cue-time']}>
                                            {formatTime(cue.startTime)} - {formatTime(cue.endTime)}
                                        </div>
                                        <div className={styles['cue-text']}>{cue.text}</div>
                                    </div>
                                );
                            })
                            :
                            <div className={styles['empty-state']}>
                                {selectedSubtitle === null ? 'Select an external subtitle to show cues.' : 'No cues loaded.'}
                            </div>
                    }
                </div>
            </div>
            {
                !streamLoadable ?
                    <div className={styles['error-state']}>
                        Preview stream is not available.
                    </div>
                    :
                    null
            }
            {
                error !== null ?
                    <div className={styles['error-state']} title={error.message}>
                        {error.message}
                    </div>
                    :
                    null
            }
        </div>
    );
};

module.exports = SubtitlePreviewVideo;
