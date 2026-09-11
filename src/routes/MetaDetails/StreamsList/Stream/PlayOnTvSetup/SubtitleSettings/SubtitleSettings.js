// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const { Button } = require('stremio/components');
const { usePreviewSubtitles } = require('./SubtitleContext');
const styles = require('../styles');

const SubtitleSettings = () => {
    const {
        availableSubtitles,
        availableSubtitlesStatus,
        availableSubtitlesError,
        selectedSubtitleId,
        loadAvailableSubtitles,
        selectSubtitle
    } = usePreviewSubtitles();

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
                            key={subtitle.id}
                            className={styles['subtitle-option-container']}
                            title={subtitle.url}
                            onClick={() => selectSubtitle(subtitle.id)}
                        >
                            <div className={styles['subtitle-id']}>{subtitle.id}</div>
                            <div className={styles['subtitle-url']}>{subtitle.url}</div>
                            {
                                selectedSubtitleId === subtitle.id ?
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

module.exports = SubtitleSettings;
