// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { Slider } = require('stremio/components');
const styles = require('./styles');

const formatTime = (time) => {
    if (typeof time !== 'number' || isNaN(time)) {
        return '--:--';
    }

    const normalizedTime = Math.max(0, time);
    const hours = Math.floor(normalizedTime / 3600);
    const minutes = Math.floor((normalizedTime % 3600) / 60);
    const seconds = Math.floor(normalizedTime % 60);

    return hours > 0 ?
        `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        :
        `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const formatSourceTime = (time) => {
    if (typeof time !== 'number' || isNaN(time)) {
        return '--:--';
    }

    const normalizedTime = Math.max(0, time);
    const hours = Math.floor(normalizedTime / 3600);
    const minutes = Math.floor((normalizedTime % 3600) / 60);
    const seconds = Math.floor(normalizedTime % 60);
    const milliseconds = Math.floor((normalizedTime % 1) * 1000);

    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
};

const SeekBar = ({ className, time, duration, buffered, sourceStartTime, disabled, onSeekRequested }) => {
    const computedDisabled = disabled || typeof time !== 'number' || isNaN(time) || typeof duration !== 'number' || isNaN(duration) || duration <= 0;
    const [seekTime, setSeekTime] = React.useState(null);
    const displayTime = seekTime !== null ? seekTime : time;
    const hasSourceStartTime = typeof sourceStartTime === 'number' && !isNaN(sourceStartTime);
    const sourceDisplayTime = hasSourceStartTime && !computedDisabled ? sourceStartTime + displayTime : null;
    const onSlide = React.useCallback((time) => {
        setSeekTime(time);
    }, []);
    const onComplete = React.useCallback((time) => {
        setSeekTime(null);

        if (typeof onSeekRequested === 'function') {
            onSeekRequested(time);
        }
    }, [onSeekRequested]);

    React.useEffect(() => {
        if (computedDisabled) {
            setSeekTime(null);
        }
    }, [computedDisabled]);

    return (
        <div className={classnames(className, styles['seek-bar-container'], { [styles['disabled']]: computedDisabled })}>
            {
                hasSourceStartTime ?
                    <div className={styles['source-time-label']}>{`Kaynak ${formatSourceTime(sourceDisplayTime)}`}</div>
                    :
                    null
            }
            <div className={styles['timeline-container']}>
                <span className={styles['time-label']}>{formatTime(displayTime)}</span>
                <div className={styles['slider-wrapper']}>
                    <Slider
                        className={styles['slider']}
                        value={computedDisabled ? 0 : displayTime}
                        buffered={0}
                        minimumValue={0}
                        maximumValue={computedDisabled ? 1 : duration}
                        disabled={computedDisabled}
                        onSlide={onSlide}
                        onComplete={onComplete}
                    />
                </div>
                <span className={styles['time-label']}>{formatTime(duration)}</span>
            </div>
        </div>
    );
};

SeekBar.propTypes = {
    className: PropTypes.string,
    time: PropTypes.number,
    duration: PropTypes.number,
    sourceStartTime: PropTypes.number,
    disabled: PropTypes.bool,
    onSeekRequested: PropTypes.func
};

module.exports = SeekBar;
