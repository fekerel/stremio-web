// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const ProbeContext = require('./ProbeContext');

const useProbe = () => {
    const context = React.useContext(ProbeContext);

    if (context === null) {
        throw new Error('useProbe must be used inside ProbeProvider');
    }

    return context;
};

module.exports = useProbe;
