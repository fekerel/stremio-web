// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const ProbeContext = require('./ProbeContext');
const useProbeFeature = require('./useProbeFeature');

const ProbeProvider = ({ children }) => {
    const contextValue = useProbeFeature();

    return (
        <ProbeContext.Provider value={contextValue}>
            {children}
        </ProbeContext.Provider>
    );
};

ProbeProvider.propTypes = {
    children: PropTypes.node
};

module.exports = ProbeProvider;
