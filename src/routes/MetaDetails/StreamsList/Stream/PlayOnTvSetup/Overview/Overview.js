// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const { Button } = require('stremio/components');
const { useDevicePicker } = require('../DevicePicker/DevicePickerContext');
const { usePreviewSubtitles } = require('../SubtitleSettings/SubtitleContext');
const usePlayOnTvSession = require('../usePlayOnTvSession');
const styles = require('./styles');

const formatSubtitleDelay = (delay) => {
    if (typeof delay !== 'number' || !isFinite(delay)) {
        return '0.00s';
    }

    return `${(delay / 1000).toFixed(2)}s`;
};

const Overview = ({ onDevicePickerOpen, onMediaInfoOpen, onSubtitleSettingsOpen, onCancelRequest }) => {
    const {
        devices,
        selectedDevice
    } = useDevicePicker();
    const {
        availableSubtitles,
        selectedSubtitle,
        subtitleDelay
    } = usePreviewSubtitles();
    const {
        canPlay,
        loading: playLoading,
        play
    } = usePlayOnTvSession({
        onSuccess: onCancelRequest
    });

    const selectedDeviceLabel = selectedDevice !== null ?
        selectedDevice.friendlyName || selectedDevice.name || selectedDevice.id
        :
        'No device selected';
    const subtitleLanguage = selectedSubtitle !== null ?
        selectedSubtitle.lang || 'unknown'
        :
        'Not selected';

    return (
        <div className={styles['overview-container']}>
            <div className={styles['status-panel']}>
                <div className={styles['status-row']}>
                    <div className={styles['status-label']}>Device</div>
                    <div className={styles['status-value']}>{selectedDeviceLabel}</div>
                </div>
                <div className={styles['status-row']}>
                    <div className={styles['status-label']}>Subtitle language</div>
                    <div className={styles['status-value']}>{subtitleLanguage}</div>
                </div>
                <div className={styles['status-row']}>
                    <div className={styles['status-label']}>Subtitle shift</div>
                    <div className={styles['status-value']}>{formatSubtitleDelay(subtitleDelay)}</div>
                </div>
            </div>
            <div className={styles['actions-grid']}>
                <Button
                    className={styles['action-card']}
                    title={'Open device picker'}
                    onClick={onDevicePickerOpen}
                >
                    <div className={styles['action-title']}>Device picker</div>
                    <div className={styles['action-subtitle']}>
                        {selectedDevice !== null ? selectedDeviceLabel : `${devices.length} devices found`}
                    </div>
                </Button>
                <Button
                    className={styles['action-card']}
                    title={'Open media info'}
                    onClick={onMediaInfoOpen}
                >
                    <div className={styles['action-title']}>Media info</div>
                    <div className={styles['action-subtitle']}>Container, video, audio and subtitles</div>
                </Button>
                <Button
                    className={styles['action-card']}
                    title={'Open subtitle settings'}
                    onClick={onSubtitleSettingsOpen}
                >
                    <div className={styles['action-title']}>Subtitle settings</div>
                    <div className={styles['action-subtitle']}>
                        {selectedSubtitle !== null ? selectedSubtitle.id : `${availableSubtitles.length} subtitles loaded`}
                    </div>
                </Button>
            </div>
            <div className={styles['session-actions']}>
                <Button
                    className={styles['cancel-button']}
                    title={'Cancel Play on TV setup'}
                    onClick={onCancelRequest}
                >
                    Cancel
                </Button>
                <Button
                    className={styles['play-button']}
                    title={'Play on selected TV'}
                    disabled={!canPlay}
                    onClick={play}
                >
                    {playLoading ? 'Starting...' : 'Play'}
                </Button>
            </div>
        </div>
    );
};

Overview.propTypes = {
    onDevicePickerOpen: PropTypes.func,
    onMediaInfoOpen: PropTypes.func,
    onSubtitleSettingsOpen: PropTypes.func,
    onCancelRequest: PropTypes.func
};

module.exports = Overview;
