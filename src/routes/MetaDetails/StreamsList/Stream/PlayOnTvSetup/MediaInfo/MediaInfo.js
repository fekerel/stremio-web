// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const styles = require('../styles');

const MediaInfo = () => {
    return (
        <div className={styles['play-on-tv-content']}>
            <div className={styles['placeholder-container']}>
                <div className={styles['section-title']}>Media info</div>
                <div className={styles['placeholder-text']}>Waiting for media inspection.</div>
            </div>
        </div>
    );
};

module.exports = MediaInfo;
