// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const ModalScreen = require('stremio/components/ModalScreen');
const DevicePicker = require('./DevicePicker');
const { DevicePickerProvider } = require('./DevicePicker/DevicePickerContext');
const MediaInfo = require('./MediaInfo');
const Overview = require('./Overview');
const SubtitleSettings = require('./SubtitleSettings');
const { SubtitleProvider } = require('./SubtitleSettings/SubtitleContext');
const styles = require('./styles');

const SCREENS = {
    OVERVIEW: 'overview',
    DEVICES: 'devices',
    MEDIA_INFO: 'media-info',
    SUBTITLES: 'subtitles'
};

const SCREEN_TITLES = {
    [SCREENS.OVERVIEW]: 'Play on TV',
    [SCREENS.DEVICES]: 'Devices',
    [SCREENS.MEDIA_INFO]: 'Media info',
    [SCREENS.SUBTITLES]: 'Subtitle settings'
};

const PlayOnTvSetup = ({ videoId, onCloseRequest }) => {
    const [activeScreen, setActiveScreen] = React.useState(SCREENS.OVERVIEW);

    const openOverview = React.useCallback(() => {
        setActiveScreen(SCREENS.OVERVIEW);
    }, []);

    const openDevicePicker = React.useCallback(() => {
        setActiveScreen(SCREENS.DEVICES);
    }, []);

    const openMediaInfo = React.useCallback(() => {
        setActiveScreen(SCREENS.MEDIA_INFO);
    }, []);

    const openSubtitleSettings = React.useCallback(() => {
        setActiveScreen(SCREENS.SUBTITLES);
    }, []);

    const handleBackRequest = React.useCallback(() => {
        if (activeScreen === SCREENS.OVERVIEW) {
            onCloseRequest();
        } else {
            openOverview();
        }
    }, [activeScreen, onCloseRequest, openOverview]);

    const renderActiveScreen = () => {
        switch (activeScreen) {
            case SCREENS.DEVICES:
                return <DevicePicker />;
            case SCREENS.MEDIA_INFO:
                return <MediaInfo />;
            case SCREENS.SUBTITLES:
                return <SubtitleSettings />;
            case SCREENS.OVERVIEW:
            default:
                return (
                    <Overview
                        onDevicePickerOpen={openDevicePicker}
                        onMediaInfoOpen={openMediaInfo}
                        onSubtitleSettingsOpen={openSubtitleSettings}
                    />
                );
        }
    };

    return (
        <DevicePickerProvider>
            <SubtitleProvider videoId={videoId}>
                <ModalScreen
                    className={styles['play-on-tv-container']}
                    title={SCREEN_TITLES[activeScreen]}
                    backButtonVisible={activeScreen !== SCREENS.OVERVIEW}
                    onBackRequest={handleBackRequest}
                    onCloseRequest={onCloseRequest}
                >
                    {renderActiveScreen()}
                </ModalScreen>
            </SubtitleProvider>
        </DevicePickerProvider>
    );
};

PlayOnTvSetup.propTypes = {
    videoId: PropTypes.string,
    onCloseRequest: PropTypes.func
};

module.exports = PlayOnTvSetup;
