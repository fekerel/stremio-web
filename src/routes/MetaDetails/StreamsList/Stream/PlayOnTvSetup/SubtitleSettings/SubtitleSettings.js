// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const { Button } = require('stremio/components');
const { usePreviewSubtitles } = require('./SubtitleContext');
const styles = require('../styles');

const SubtitleSettings = ({ onSubtitlePreviewOpen }) => {
    const {
        availableSubtitles,
        availableSubtitlesStatus,
        availableSubtitlesError,
        selectedSubtitleKey,
        loadAvailableSubtitles,
        selectSubtitle
    } = usePreviewSubtitles();
    const previewOpenedRef = React.useRef(false);

    React.useEffect(() => {
        if (availableSubtitlesStatus === 'idle') {
            loadAvailableSubtitles().catch(() => null);
        }

        if (!previewOpenedRef.current && typeof onSubtitlePreviewOpen === 'function') {
            previewOpenedRef.current = true;
            onSubtitlePreviewOpen();
        }
    }, [availableSubtitlesStatus, loadAvailableSubtitles, onSubtitlePreviewOpen]);

    const loadButtonOnClick = React.useCallback(() => {
        loadAvailableSubtitles().catch(() => null);
    }, [loadAvailableSubtitles]);

    return (
        <div className={styles['play-on-tv-content']}>
            <div className={styles['actions-container']}>
                <Button
                    className={styles['load-button-container']}
                    title={'Load subtitles'}
                    disabled={availableSubtitlesStatus === 'loading'}
                    onClick={loadButtonOnClick}
                >
                    Load subtitles
                </Button>
                <div className={styles['status-container']}>
                    {availableSubtitlesStatus}
                </div>
                <Button
                    className={styles['load-button-container']}
                    title={'Open video preview'}
                    onClick={onSubtitlePreviewOpen}
                >
                    Open video preview
                </Button>
            </div>
            {
                availableSubtitlesError !== null ?
                    <div className={styles['error-container']} title={availableSubtitlesError.message}>
                        {availableSubtitlesError.message}
                    </div>
                    :
                    null
            }
            <div className={styles['subtitles-list-container']}>
                {
                    availableSubtitles.map((subtitle) => (
                        <Button
                            key={subtitle.key}
                            className={styles['subtitle-option-container']}
                            title={subtitle.url}
                            onClick={() => selectSubtitle(subtitle.key)}
                        >
                            <div className={styles['subtitle-lang']}>{subtitle.lang || 'unknown'}</div>
                            <div className={styles['subtitle-id']}>{subtitle.id}</div>
                            <div className={styles['subtitle-url']}>{subtitle.url}</div>
                            {
                                selectedSubtitleKey === subtitle.key ?
                                    <div className={styles['selected-label']}>Selected</div>
                                    :
                                    null
                            }
                        </Button>
                    ))
                }
            </div>
        </div>
    );
};

SubtitleSettings.propTypes = {
    onSubtitlePreviewOpen: PropTypes.func
};

module.exports = SubtitleSettings;
