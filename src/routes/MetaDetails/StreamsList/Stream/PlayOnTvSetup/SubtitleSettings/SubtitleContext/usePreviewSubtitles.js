// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const SubtitleContext = require('./SubtitleContext');

const usePreviewSubtitles = () => {
    const context = React.useContext(SubtitleContext);

    if (context === null) {
        throw new Error('usePreviewSubtitles must be used inside SubtitleProvider');
    }

    return context;
};

module.exports = usePreviewSubtitles;
