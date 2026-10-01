// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const debounce = require('lodash.debounce');
const { default: useRouteFocused } = require('stremio/common/useRouteFocused');
const { useBinaryState } = require('stremio/common');
const { Button } = require('stremio/components');
const PreciseSlider = require('./PreciseSlider');
const formatTime = require('./formatTime');
const styles = require('./styles');

const POLL_INTERVAL = 200;

const isFiniteNumber = (value) => typeof value === 'number' && isFinite(value);

const readVideoElementState = (containerElement) => {
    const videoElement = containerElement instanceof HTMLElement ?
        containerElement.querySelector('video')
        :
        null;

    if (!(videoElement instanceof HTMLVideoElement)) {
        return null;
    }

    const currentTime = isFiniteNumber(videoElement.currentTime) ? videoElement.currentTime * 1000 : null;
    const duration = isFiniteNumber(videoElement.duration) ? videoElement.duration * 1000 : null;
    let buffered = null;

    if (currentTime !== null) {
        const time = currentTime / 1000;

        for (let i = 0; i < videoElement.buffered.length; i++) {
            if (videoElement.buffered.start(i) <= time && time <= videoElement.buffered.end(i)) {
                buffered = Math.floor(videoElement.buffered.end(i) * 1000);
                break;
            }
        }
    }

    return {
        time: currentTime,
        duration,
        buffered
    };
};

const PreciseSeekBar = ({ className, containerRef, time, duration, buffered, onSeekRequested, playbackSpeed }) => {
    const routeFocused = useRouteFocused();
    const [playbackState, setPlaybackState] = React.useState({
        time,
        duration,
        buffered
    });
    const [seekTime, setSeekTime] = React.useState(null);

    const displayTime = seekTime !== null ? seekTime : playbackState.time;
    const displayDuration = playbackState.duration;
    const displayBuffered = playbackState.buffered;
    const disabled = displayTime === null || isNaN(displayTime) || displayDuration === null || isNaN(displayDuration);

    const [remainingTimeMode,,, toggleRemainingTimeMode] = useBinaryState(false);
    const resetTimeDebounced = React.useCallback(debounce(() => {
        setSeekTime(null);
    }, 1500), []);
    const onSlide = React.useCallback((time) => {
        resetTimeDebounced.cancel();
        setSeekTime(time);
    }, []);
    const onComplete = React.useCallback((time) => {
        resetTimeDebounced();
        setSeekTime(time);
        if (typeof onSeekRequested === 'function') {
            onSeekRequested(time);
        }
    }, [onSeekRequested]);
    React.useLayoutEffect(() => {
        if (!routeFocused || disabled) {
            resetTimeDebounced.cancel();
            setSeekTime(null);
        }
    }, [routeFocused, disabled]);
    React.useEffect(() => {
        return () => {
            resetTimeDebounced.cancel();
        };
    }, []);
    React.useEffect(() => {
        setPlaybackState((playbackState) => ({
            time: duration === null || isNaN(duration) ?
                null
                :
                playbackState.time !== null && isFiniteNumber(playbackState.time) ? playbackState.time : time,
            duration,
            buffered: playbackState.buffered !== null && isFiniteNumber(playbackState.buffered) ? playbackState.buffered : buffered
        }));
    }, [time, duration, buffered]);
    React.useEffect(() => {
        const update = () => {
            const nextState = readVideoElementState(containerRef?.current);

            if (nextState === null) {
                return;
            }

            setPlaybackState((playbackState) => {
                const timeChanged = playbackState.time !== nextState.time &&
                    (
                        !isFiniteNumber(playbackState.time) ||
                        !isFiniteNumber(nextState.time) ||
                        Math.abs(playbackState.time - nextState.time) >= 100
                    );
                const durationChanged = playbackState.duration !== nextState.duration;
                const bufferedChanged = playbackState.buffered !== nextState.buffered &&
                    (
                        !isFiniteNumber(playbackState.buffered) ||
                        !isFiniteNumber(nextState.buffered) ||
                        Math.abs(playbackState.buffered - nextState.buffered) >= 500
                    );

                return timeChanged || durationChanged || bufferedChanged ?
                    nextState
                    :
                    playbackState;
            });
        };
        const interval = window.setInterval(update, POLL_INTERVAL);

        update();

        return () => {
            window.clearInterval(interval);
        };
    }, [containerRef]);

    return (
        <div className={classnames(className, styles['seek-bar-container'], { 'active': seekTime !== null })}>
            <div className={styles['label']}>{formatTime(displayTime)}</div>
            <PreciseSlider
                className={classnames(styles['slider'], { 'active': seekTime !== null })}
                value={
                    !disabled ?
                        displayTime
                        :
                        0
                }
                buffered={displayBuffered}
                minimumValue={0}
                maximumValue={displayDuration}
                disabled={disabled}
                onSlide={onSlide}
                onComplete={onComplete}
            />
            <Button onClick={toggleRemainingTimeMode} tabIndex={-1}>
                <div className={styles['label']}>
                    {remainingTimeMode && displayDuration !== null && !isNaN(displayDuration) && displayTime !== null && !isNaN(displayTime)
                        ? formatTime((displayDuration - displayTime)/playbackSpeed, '-')
                        : formatTime(displayDuration) }
                </div>
            </Button>
        </div>
    );
};

PreciseSeekBar.propTypes = {
    className: PropTypes.string,
    containerRef: PropTypes.object,
    time: PropTypes.number,
    duration: PropTypes.number,
    buffered: PropTypes.number,
    onSeekRequested: PropTypes.func,
    playbackSpeed: PropTypes.number
};

module.exports = PreciseSeekBar;
