// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const { useStreamInfo } = require('../StreamInfoContext');
const styles = require('../styles');

const MediaInfo = () => {
    const {
        streamLink,
        type,
        videoId
    } = useStreamInfo();

    return (
        <div className={styles['play-on-tv-content']}>
            <div className={styles['placeholder-container']}>
                <div className={styles['section-title']}>Media info</div>
                <div className={styles['placeholder-text']}>Waiting for media inspection.</div>
                <div className={styles['placeholder-text']}>Type: {type || '-'}</div>
                <div className={styles['placeholder-text']}>Video: {videoId || '-'}</div>
                <div className={styles['placeholder-text']}>Stream: {streamLink || '-'}</div>
            </div>
        </div>
    );
};

module.exports = MediaInfo;
