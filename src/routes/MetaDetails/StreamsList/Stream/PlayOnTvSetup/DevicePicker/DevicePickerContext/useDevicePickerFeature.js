// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const { useStremoteSocket } = require('stremio/common/StremoteServer');

const DISCOVERY_PATH = '/ws/discovery';

const normalizeDevice = (device) => {
    if (device === null || typeof device !== 'object' || typeof device.id !== 'string') {
        return null;
    }

    return {
        id: device.id,
        friendlyName: typeof device.friendlyName === 'string' ? device.friendlyName : '',
        ipAddress: typeof device.ipAddress === 'string' ? device.ipAddress : ''
    };
};

const normalizeDevices = (devices) => {
    if (!Array.isArray(devices)) {
        return [];
    }

    return devices
        .map(normalizeDevice)
        .filter((device) => device !== null);
};

const upsertDevice = (devices, device) => {
    const normalizedDevice = normalizeDevice(device);

    if (normalizedDevice === null) {
        return devices;
    }

    const deviceIndex = devices.findIndex(({ id }) => id === normalizedDevice.id);

    if (deviceIndex === -1) {
        return [...devices, normalizedDevice];
    }

    return devices.map((currentDevice, index) => {
        return index === deviceIndex ? normalizedDevice : currentDevice;
    });
};

const useDevicePickerFeature = () => {
    const [devices, setDevices] = React.useState([]);
    const [selectedDeviceId, setSelectedDeviceId] = React.useState(null);
    const [error, setError] = React.useState(null);
    const [lastUpdatedAt, setLastUpdatedAt] = React.useState(null);

    const handleMessage = React.useCallback((message) => {
        switch (message.type) {
            case 'snapshot':
                setDevices(normalizeDevices(message.devices));
                setError(null);
                setLastUpdatedAt(Date.now());
                break;
            case 'device.added':
            case 'device.updated':
                setDevices((devices) => upsertDevice(devices, message.device));
                setError(null);
                setLastUpdatedAt(Date.now());
                break;
            case 'error':
                setError(new Error(typeof message.message === 'string' ? message.message : 'Device discovery failed'));
                break;
            default:
                break;
        }
    }, []);

    const handleError = React.useCallback((error) => {
        setError(error);
    }, []);

    const { status } = useStremoteSocket(DISCOVERY_PATH, {
        reconnect: true,
        onMessage: handleMessage,
        onError: handleError
    });

    const selectedDevice = React.useMemo(() => {
        return devices.find(({ id }) => id === selectedDeviceId) || null;
    }, [devices, selectedDeviceId]);

    const selectDevice = React.useCallback((deviceId) => {
        setSelectedDeviceId(deviceId);
    }, []);

    const clearSelectedDevice = React.useCallback(() => {
        setSelectedDeviceId(null);
    }, []);

    return React.useMemo(() => ({
        devices,
        status,
        error,
        lastUpdatedAt,
        selectedDeviceId,
        selectedDevice,
        selectDevice,
        clearSelectedDevice
    }), [
        devices,
        status,
        error,
        lastUpdatedAt,
        selectedDeviceId,
        selectedDevice,
        selectDevice,
        clearSelectedDevice
    ]);
};

module.exports = useDevicePickerFeature;
