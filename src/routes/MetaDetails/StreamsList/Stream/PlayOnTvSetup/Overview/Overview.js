// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const { Button } = require('stremio/components');
const { useDevicePicker } = require('../DevicePicker/DevicePickerContext');
const { usePreviewSubtitles } = require('../SubtitleSettings/SubtitleContext');
const styles = require('../styles');

const Overview = ({ onDevicePickerOpen, onMediaInfoOpen, onSubtitleSettingsOpen }) => {
    const {
        devices,
        selectedDevice
    } = useDevicePicker();
    const {
        availableSubtitles,
        selectedSubtitle
    } = usePreviewSubtitles();

    return (
        <div className={styles['play-on-tv-content']}>
            <div className={styles['overview-grid-container']}>
                <Button
                    className={styles['overview-option-container']}
                    title={'Open device picker'}
                    onClick={onDevicePickerOpen}
                >
                    <div className={styles['overview-option-title']}>Device picker</div>
                    <div className={styles['overview-option-subtitle']}>
                        {selectedDevice !== null ? selectedDevice.friendlyName || selectedDevice.id : `${devices.length} devices found`}
                    </div>
                </Button>
                <Button
                    className={styles['overview-option-container']}
                    title={'Open media info'}
                    onClick={onMediaInfoOpen}
                >
                    <div className={styles['overview-option-title']}>Media info</div>
                    <div className={styles['overview-option-subtitle']}>Stream technical details</div>
                </Button>
                <Button
                    className={styles['overview-option-container']}
                    title={'Open subtitle settings'}
                    onClick={onSubtitleSettingsOpen}
                >
                    <div className={styles['overview-option-title']}>Subtitle settings</div>
                    <div className={styles['overview-option-subtitle']}>
                        {selectedSubtitle !== null ? selectedSubtitle.id : `${availableSubtitles.length} subtitles loaded`}
                    </div>
                </Button>
            </div>
        </div>
    );
};

Overview.propTypes = {
    onDevicePickerOpen: PropTypes.func,
    onMediaInfoOpen: PropTypes.func,
    onSubtitleSettingsOpen: PropTypes.func
};

module.exports = Overview;
