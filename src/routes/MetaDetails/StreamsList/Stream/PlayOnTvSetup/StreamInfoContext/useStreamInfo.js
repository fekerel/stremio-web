// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const StreamInfoContext = require('./StreamInfoContext');

const useStreamInfo = () => {
    const context = React.useContext(StreamInfoContext);

    if (context === null) {
        throw new Error('useStreamInfo must be used inside StreamInfoProvider');
    }

    return context;
};

module.exports = useStreamInfo;
