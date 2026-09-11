// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const { Button } = require('stremio/components');
const { useDevicePicker } = require('./DevicePickerContext');
const styles = require('../styles');

const DevicePicker = () => {
    const {
        devices,
        status,
        error,
        selectedDeviceId,
        selectedDevice,
        selectDevice,
        clearSelectedDevice
    } = useDevicePicker();

    return (
        <div className={styles['play-on-tv-content']}>
            <div className={styles['device-picker-container']}>
                <div className={styles['section-header-container']}>
                    <div className={styles['section-title']}>Devices</div>
                    <div className={styles['status-container']}>{status}</div>
                </div>
                {
                    selectedDevice !== null ?
                        <div className={styles['selected-device-container']}>
                            <div className={styles['selected-device-title']}>{selectedDevice.friendlyName || selectedDevice.id}</div>
                            <div className={styles['selected-device-subtitle']}>{selectedDevice.ipAddress}</div>
                            <Button
                                className={styles['clear-device-button-container']}
                                title={'Clear selected device'}
                                onClick={clearSelectedDevice}
                            >
                                Clear
                            </Button>
                        </div>
                        :
                        null
                }
                {
                    error !== null ?
                        <div className={styles['error-container']} title={error.message}>
                            {error.message}
                        </div>
                        :
                        null
                }
                <div className={styles['devices-list-container']}>
                    {
                        devices.map((device) => (
                            <Button
                                key={device.id}
                                className={styles['device-option-container']}
                                title={`${device.friendlyName} ${device.ipAddress}`}
                                onClick={() => selectDevice(device.id)}
                            >
                                <div className={styles['device-name']}>{device.friendlyName || device.id}</div>
                                <div className={styles['device-address']}>{device.ipAddress}</div>
                                {
                                    selectedDeviceId === device.id ?
                                        <div className={styles['selected-label']}>Selected</div>
                                        :
                                        null
                                }
                            </Button>
                        ))
                    }
                </div>
            </div>
        </div>
    );
};

module.exports = DevicePicker;
