// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const SubtitleContext = require('./SubtitleContext');
const usePreviewSubtitlesFeature = require('./usePreviewSubtitlesFeature');

const SubtitleProvider = ({ children, videoId }) => {
    const contextValue = usePreviewSubtitlesFeature(videoId);

    return (
        <SubtitleContext.Provider value={contextValue}>
            {children}
        </SubtitleContext.Provider>
    );
};

SubtitleProvider.propTypes = {
    children: PropTypes.node,
    videoId: PropTypes.string
};

module.exports = SubtitleProvider;
