// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const ModalScreen = require('stremio/components/ModalScreen');
const DevicePicker = require('./DevicePicker');
const { DevicePickerProvider } = require('./DevicePicker/DevicePickerContext');
const MediaInfo = require('./MediaInfo');
const Overview = require('./Overview');
const { ProbeProvider } = require('./ProbeContext');
const { StreamInfoProvider } = require('./StreamInfoContext');
const SubtitleSettings = require('./SubtitleSettings');
const { SubtitleProvider } = require('./SubtitleSettings/SubtitleContext');
const SubtitlePreviewVideo = require('./SubtitleSettings/SubtitlePreviewVideo');
const styles = require('./styles');

const SCREENS = {
    OVERVIEW: 'overview',
    DEVICES: 'devices',
    MEDIA_INFO: 'media-info',
    SUBTITLES: 'subtitles',
    SUBTITLE_PREVIEW: 'subtitle-preview'
};

const SCREEN_TITLES = {
    [SCREENS.OVERVIEW]: 'Play on TV',
    [SCREENS.DEVICES]: 'Devices',
    [SCREENS.MEDIA_INFO]: 'Media info',
    [SCREENS.SUBTITLES]: 'Subtitle settings',
    [SCREENS.SUBTITLE_PREVIEW]: 'Subtitle preview'
};

const PlayOnTvSetup = ({ stream, streamLink, type, videoId, onCloseRequest }) => {
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

    const openSubtitlePreview = React.useCallback(() => {
        setActiveScreen(SCREENS.SUBTITLE_PREVIEW);
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
                return <SubtitleSettings onSubtitlePreviewOpen={openSubtitlePreview} />;
            case SCREENS.SUBTITLE_PREVIEW:
                return <SubtitlePreviewVideo />;
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
        <StreamInfoProvider stream={stream} streamLink={streamLink} type={type} videoId={videoId}>
            <ProbeProvider>
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
            </ProbeProvider>
        </StreamInfoProvider>
    );
};

PlayOnTvSetup.propTypes = {
    stream: PropTypes.object,
    streamLink: PropTypes.string,
    type: PropTypes.string,
    videoId: PropTypes.string,
    onCloseRequest: PropTypes.func
};

module.exports = PlayOnTvSetup;
