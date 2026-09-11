// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const DevicePickerContext = require('./DevicePickerContext');

const useDevicePicker = () => {
    const context = React.useContext(DevicePickerContext);

    if (context === null) {
        throw new Error('useDevicePicker must be used inside DevicePickerProvider');
    }

    return context;
};

module.exports = useDevicePicker;
