// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const DevicePickerContext = require('./DevicePickerContext');
const useDevicePickerFeature = require('./useDevicePickerFeature');

const DevicePickerProvider = ({ children }) => {
    const contextValue = useDevicePickerFeature();

    return (
        <DevicePickerContext.Provider value={contextValue}>
            {children}
        </DevicePickerContext.Provider>
    );
};

DevicePickerProvider.propTypes = {
    children: PropTypes.node
};

module.exports = DevicePickerProvider;
