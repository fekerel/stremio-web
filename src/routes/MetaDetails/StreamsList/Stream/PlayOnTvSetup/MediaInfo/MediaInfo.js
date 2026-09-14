// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const { Button } = require('stremio/components');
const { useProbe } = require('../ProbeContext');
const styles = require('./styles');

const SCREENS = {
    OVERVIEW: 'overview',
    AUDIO: 'audio',
    SUBTITLES: 'subtitles'
};

const formatNumber = (value, fractionDigits = 0) => {
    return typeof value === 'number' && isFinite(value) ?
        value.toLocaleString(undefined, { maximumFractionDigits: fractionDigits })
        :
        '-';
};

const formatDuration = (duration) => {
    if (typeof duration !== 'number' || !isFinite(duration)) {
        return '-';
    }

    const totalSeconds = Math.max(0, Math.floor(duration));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return hours > 0 ?
        `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        :
        `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const formatBitrate = (value) => {
    if (typeof value !== 'number' || !isFinite(value) || value <= 0) {
        return '-';
    }

    if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)} Mbps`;
    }

    return `${Math.round(value / 1000)} Kbps`;
};

const formatCodec = (codec) => {
    if (typeof codec !== 'string' || codec.length === 0) {
        return '-';
    }

    switch (codec.toLowerCase()) {
        case 'hevc':
            return 'H.265 / HEVC';
        case 'h264':
            return 'H.264';
        case 'eac3':
            return 'E-AC-3';
        case 'aac':
            return 'AAC';
        case 'subrip':
            return 'SubRip';
        default:
            return codec.toUpperCase();
    }
};

const formatContainer = (name) => {
    if (typeof name !== 'string' || name.length === 0) {
        return '-';
    }

    return name
        .split(',')
        .map((part) => {
            switch (part.trim().toLowerCase()) {
                case 'matroska':
                    return 'MKV';
                case 'webm':
                    return 'WebM';
                default:
                    return part.trim().toUpperCase();
            }
        })
        .join(' / ');
};

const formatResolution = (stream) => {
    if (typeof stream?.width !== 'number' || typeof stream?.height !== 'number') {
        return '-';
    }

    return `${stream.width} x ${stream.height}`;
};

const formatFrameRate = (frameRate) => {
    return typeof frameRate === 'number' && isFinite(frameRate) ?
        `${frameRate.toFixed(3)} fps`
        :
        '-';
};

const getLanguage = (stream) => {
    return typeof stream.language === 'string' && stream.language.length > 0 ?
        stream.language.toUpperCase()
        :
        'Unknown';
};

const getTrackName = (stream, fallback) => {
    return typeof stream.title === 'string' && stream.title.length > 0 ?
        stream.title
        :
        fallback;
};

const getVideoDetails = (stream) => {
    if (stream === null || stream === undefined) {
        return '-';
    }

    return [
        formatCodec(stream.codec),
        formatResolution(stream),
        formatFrameRate(stream.frameRate),
        stream.isHdr ? 'HDR' : null
    ].filter((value) => value !== null && value !== '-').join(' - ') || '-';
};

const includesSearch = (stream, query) => {
    if (query.length === 0) {
        return true;
    }

    return [
        stream.language,
        stream.title,
        stream.codec,
        stream.index,
        stream.id
    ].some((value) => String(value ?? '').toLowerCase().includes(query));
};

const MediaInfo = () => {
    const {
        status,
        error,
        probe,
        videoStreams,
        audioStreams,
        subtitleStreams,
        reloadProbe
    } = useProbe();
    const [activeScreen, setActiveScreen] = React.useState(SCREENS.OVERVIEW);
    const [subtitleSearch, setSubtitleSearch] = React.useState('');

    const primaryVideoStream = videoStreams[0] || null;
    const subtitleQuery = subtitleSearch.trim().toLowerCase();
    const filteredSubtitleStreams = React.useMemo(() => {
        return subtitleStreams.filter((stream) => includesSearch(stream, subtitleQuery));
    }, [subtitleQuery, subtitleStreams]);

    const openOverview = React.useCallback(() => {
        setActiveScreen(SCREENS.OVERVIEW);
    }, []);

    const openAudio = React.useCallback(() => {
        setActiveScreen(SCREENS.AUDIO);
    }, []);

    const openSubtitles = React.useCallback(() => {
        setActiveScreen(SCREENS.SUBTITLES);
    }, []);

    const reloadButtonOnClick = React.useCallback(() => {
        reloadProbe().catch(() => null);
    }, [reloadProbe]);

    if (activeScreen === SCREENS.AUDIO) {
        return (
            <div className={styles['media-info-container']}>
                <div className={styles['detail-header']}>
                    <Button className={styles['back-button']} title={'Back to media info'} onClick={openOverview}>
                        Media info
                    </Button>
                    <div className={styles['detail-title']}>Audio tracks</div>
                    <div className={styles['count-pill']}>{audioStreams.length} tracks</div>
                </div>
                <div className={styles['tracks-list']}>
                    {
                        audioStreams.length > 0 ?
                            audioStreams.map((stream) => (
                                <div key={stream.index} className={styles['track-row']}>
                                    <div className={styles['track-main']}>
                                        <div className={styles['track-language']}>{getLanguage(stream)}</div>
                                        <div className={styles['track-title']}>{getTrackName(stream, `Audio #${stream.index}`)}</div>
                                    </div>
                                    <div className={styles['track-meta']}>
                                        <span>#{stream.index}</span>
                                        <span>{formatCodec(stream.codec)}</span>
                                        <span>{stream.channels ? `${stream.channels} ch` : '-'}</span>
                                        <span>{stream.channelLayout || `${formatNumber(stream.sampleRate / 1000, 1)} kHz`}</span>
                                    </div>
                                </div>
                            ))
                            :
                            <div className={styles['empty-state']}>No audio tracks found.</div>
                    }
                </div>
            </div>
        );
    }

    if (activeScreen === SCREENS.SUBTITLES) {
        return (
            <div className={styles['media-info-container']}>
                <div className={styles['detail-header']}>
                    <Button className={styles['back-button']} title={'Back to media info'} onClick={openOverview}>
                        Media info
                    </Button>
                    <div className={styles['detail-title']}>Subtitle tracks</div>
                    <div className={styles['count-pill']}>{subtitleStreams.length} tracks</div>
                </div>
                <input
                    className={styles['search-input']}
                    value={subtitleSearch}
                    placeholder={'Search language, title or index...'}
                    onChange={(event) => setSubtitleSearch(event.target.value)}
                />
                <div className={styles['tracks-list']}>
                    {
                        filteredSubtitleStreams.length > 0 ?
                            filteredSubtitleStreams.map((stream) => (
                                <div key={stream.index} className={styles['track-row']}>
                                    <div className={styles['track-main']}>
                                        <div className={styles['track-language']}>{getLanguage(stream)}</div>
                                        <div className={styles['track-title']}>{getTrackName(stream, `Subtitle #${stream.index}`)}</div>
                                    </div>
                                    <div className={styles['track-meta']}>
                                        <span>#{stream.index}</span>
                                        <span>{formatCodec(stream.codec)}</span>
                                    </div>
                                </div>
                            ))
                            :
                            <div className={styles['empty-state']}>No subtitle tracks found.</div>
                    }
                </div>
            </div>
        );
    }

    return (
        <div className={styles['media-info-container']}>
            <div className={styles['summary-panel']}>
                <div className={styles['summary-heading']}>
                    <div>
                        <div className={styles['summary-title']}>Media info</div>
                        <div className={styles['summary-status']}>Probe {status}</div>
                    </div>
                    <Button
                        className={styles['reload-button']}
                        title={'Reload media probe'}
                        disabled={status === 'loading'}
                        onClick={reloadButtonOnClick}
                    >
                        Reload
                    </Button>
                </div>
                <div className={styles['summary-grid']}>
                    <div className={styles['summary-item']}>
                        <div className={styles['summary-label']}>Container</div>
                        <div className={styles['summary-value']}>{formatContainer(probe?.format?.name)}</div>
                    </div>
                    <div className={styles['summary-item']}>
                        <div className={styles['summary-label']}>Duration</div>
                        <div className={styles['summary-value']}>{formatDuration(probe?.format?.duration)}</div>
                    </div>
                    <div className={styles['summary-item']}>
                        <div className={styles['summary-label']}>Bitrate</div>
                        <div className={styles['summary-value']}>{formatBitrate(primaryVideoStream?.formatBitRate)}</div>
                    </div>
                    <div className={styles['summary-item']}>
                        <div className={styles['summary-label']}>Video</div>
                        <div className={styles['summary-value']}>{getVideoDetails(primaryVideoStream)}</div>
                    </div>
                </div>
                {
                    error !== null ?
                        <div className={styles['error-state']} title={error.message}>
                            {error.message}
                        </div>
                        :
                        null
                }
            </div>
            <div className={styles['detail-actions']}>
                <Button className={styles['detail-card']} title={'Open audio tracks'} onClick={openAudio}>
                    <div className={styles['detail-card-main']}>
                        <div className={styles['detail-card-title']}>Audio tracks</div>
                        <div className={styles['detail-card-subtitle']}>Language, codec and channels</div>
                    </div>
                    <div className={styles['count-pill']}>{audioStreams.length} tracks</div>
                </Button>
                <Button className={styles['detail-card']} title={'Open subtitle tracks'} onClick={openSubtitles}>
                    <div className={styles['detail-card-main']}>
                        <div className={styles['detail-card-title']}>Subtitle tracks</div>
                        <div className={styles['detail-card-subtitle']}>Language, title and stream index</div>
                    </div>
                    <div className={styles['count-pill']}>{subtitleStreams.length} tracks</div>
                </Button>
            </div>
        </div>
    );
};

module.exports = MediaInfo;
