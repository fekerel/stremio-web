// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const StreamInfoContext = require('./StreamInfoContext');

const StreamInfoProvider = ({ children, stream, streamLink, type, videoId }) => {
    const contextValue = React.useMemo(() => ({
        stream,
        streamLink,
        type,
        videoId
    }), [stream, streamLink, type, videoId]);

    return (
        <StreamInfoContext.Provider value={contextValue}>
            {children}
        </StreamInfoContext.Provider>
    );
};

StreamInfoProvider.propTypes = {
    children: PropTypes.node,
    stream: PropTypes.object,
    streamLink: PropTypes.string,
    type: PropTypes.string,
    videoId: PropTypes.string
};

module.exports = StreamInfoProvider;
