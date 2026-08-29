// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { default: Icon } = require('@stremio/stremio-icons/react');
const { useToast } = require('stremio/common');
const { WS_BASE_URL } = require('stremio/common/config');
const { request: requestApi } = require('stremio/common/apiClient');
const { Button, ModalDialog, SearchBar, TextInput } = require('stremio/components');
const styles = require('./styles');

const resolveWebSocketUrl = (path) => {
    const baseUrl = WS_BASE_URL.endsWith('/') ? WS_BASE_URL : `${WS_BASE_URL}/`;
    const normalizedPath = typeof path === 'string' && path.startsWith('/') ? path.slice(1) : path;
    return new URL(normalizedPath, baseUrl).toString();
};

const normalizeDevices = (devices) => {
    return Array.isArray(devices) ?
        devices.filter((device) => typeof device?.id === 'string')
        :
        [];
};

const upsertDevice = (devices, device) => {
    if (typeof device?.id !== 'string') {
        return devices;
    }

    const index = devices.findIndex(({ id }) => id === device.id);
    if (index === -1) {
        return [...devices, device];
    }

    return devices.map((existingDevice, existingDeviceIndex) => (
        existingDeviceIndex === index ?
            {
                ...existingDevice,
                ...device
            }
            :
            existingDevice
    ));
};

const normalizeSubtitleOptions = (subtitlesByLanguage) => {
    if (typeof subtitlesByLanguage !== 'object' || subtitlesByLanguage === null) {
        return [];
    }

    return Object.entries(subtitlesByLanguage)
        .map(([language, subtitles]) => {
            const subtitle = Array.isArray(subtitles) ?
                subtitles.find((subtitle) => typeof subtitle?.id === 'string' && typeof subtitle?.url === 'string')
                :
                null;

            return subtitle ?
                {
                    ...subtitle,
                    lang: subtitle.lang || language,
                }
                :
                null;
        })
        .filter((subtitle) => subtitle !== null);
};

const getStreamFilename = (stream) => {
    return stream?.behaviorHints?.filename || stream?.deepLinks?.externalPlayer?.fileName;
};

const getSubtitleKey = (subtitle) => {
    return `${subtitle.lang}:${subtitle.id}`;
};

const getDeviceTitle = (device) => {
    return device.friendlyName || device.ipAddress || device.id;
};

const getSubtitleTitle = (subtitle) => {
    return [subtitle.lang, subtitle.id].filter(Boolean).join(' - ');
};

const SHIFT_DIRECTION_EARLY = 'early';
const SHIFT_DIRECTION_DELAYED = 'delayed';

const getShiftMs = (shiftSeconds, shiftDirection) => {
    const value = Number.parseFloat(String(shiftSeconds).replace(',', '.'));
    const amount = Number.isFinite(value) ? Math.abs(value) : 0;
    const shiftMs = Math.round(amount * 1000);
    return shiftDirection === SHIFT_DIRECTION_EARLY ? -shiftMs : shiftMs;
};

const PlayOnTvModal = ({ request, onCloseRequest }) => {
    const toast = useToast();
    const discoverySocketRef = React.useRef(null);
    const subtitlesRequestIdRef = React.useRef(0);
    const mountedRef = React.useRef(false);
    const [devicesStatus, setDevicesStatus] = React.useState('connecting');
    const [devices, setDevices] = React.useState([]);
    const [selectedDeviceId, setSelectedDeviceId] = React.useState(null);
    const [subtitlesEnabled, setSubtitlesEnabled] = React.useState(false);
    const [subtitlesStatus, setSubtitlesStatus] = React.useState('idle');
    const [subtitleOptions, setSubtitleOptions] = React.useState([]);
    const [selectedSubtitleKey, setSelectedSubtitleKey] = React.useState(null);
    const [subtitleSearch, setSubtitleSearch] = React.useState('');
    const [subtitleShiftDirection, setSubtitleShiftDirection] = React.useState(SHIFT_DIRECTION_DELAYED);
    const [subtitleShiftSeconds, setSubtitleShiftSeconds] = React.useState('0');
    const [playbackStatus, setPlaybackStatus] = React.useState('idle');

    const closeDiscoverySocket = React.useCallback(() => {
        if (discoverySocketRef.current !== null) {
            const socket = discoverySocketRef.current;
            discoverySocketRef.current = null;
            socket.onopen = null;
            socket.onmessage = null;
            socket.onerror = null;
            socket.onclose = null;
            socket.close();
        }
    }, []);

    const selectedDevice = React.useMemo(() => {
        return devices.find(({ id }) => id === selectedDeviceId) || null;
    }, [devices, selectedDeviceId]);

    const selectedSubtitle = React.useMemo(() => {
        return subtitleOptions.find((subtitle) => getSubtitleKey(subtitle) === selectedSubtitleKey) || null;
    }, [subtitleOptions, selectedSubtitleKey]);

    const filteredSubtitleOptions = React.useMemo(() => {
        const query = subtitleSearch.trim().toLowerCase();
        if (query.length === 0) {
            return subtitleOptions;
        }

        return subtitleOptions.filter((subtitle) => (
            [
                subtitle.lang,
                subtitle.id,
                subtitle.url
            ]
                .filter((value) => typeof value === 'string')
                .join(' ')
                .toLowerCase()
                .includes(query)
        ));
    }, [subtitleOptions, subtitleSearch]);

    const discoverSubtitles = React.useCallback(() => {
        const requestId = subtitlesRequestIdRef.current + 1;
        subtitlesRequestIdRef.current = requestId;
        setSubtitlesStatus('loading');
        setSubtitleOptions([]);
        setSelectedSubtitleKey(null);

        if (!request?.subtitleAddonTransportUrl) {
            setSubtitlesStatus('missing');
            return;
        }

        requestApi('/subtitles/discover', {
            method: 'POST',
            body: JSON.stringify({
                subtitleAddonTransportUrl: request.subtitleAddonTransportUrl,
                type: request.type,
                videoId: request.videoId,
                sourceUrl: request.sourceUrl,
                videoHash: request.stream?.behaviorHints?.videoHash,
                videoSize: request.stream?.behaviorHints?.videoSize,
                filename: getStreamFilename(request.stream),
            }),
        })
            .then((response) => {
                if (!mountedRef.current || subtitlesRequestIdRef.current !== requestId) {
                    return;
                }

                const options = normalizeSubtitleOptions(response);
                setSubtitleOptions(options);
                setSubtitlesStatus(options.length === 0 ? 'empty' : 'ready');
            })
            .catch(() => {
                if (!mountedRef.current || subtitlesRequestIdRef.current !== requestId) {
                    return;
                }

                setSubtitlesStatus('error');
            });
    }, [request]);

    const selectDevice = React.useCallback((device) => () => {
        setSelectedDeviceId(device.id);
    }, []);

    const selectSubtitle = React.useCallback((subtitle) => () => {
        setSelectedSubtitleKey(getSubtitleKey(subtitle));
    }, []);

    const subtitleSearchOnChange = React.useCallback((event) => {
        setSubtitleSearch(event.target.value);
    }, []);

    const subtitleShiftSecondsOnChange = React.useCallback((event) => {
        setSubtitleShiftSeconds(event.currentTarget.value);
    }, []);

    const setSubtitleShiftEarly = React.useCallback(() => {
        setSubtitleShiftDirection(SHIFT_DIRECTION_EARLY);
    }, []);

    const setSubtitleShiftDelayed = React.useCallback(() => {
        setSubtitleShiftDirection(SHIFT_DIRECTION_DELAYED);
    }, []);

    const enableSubtitles = React.useCallback(() => {
        setSubtitlesEnabled(true);
    }, []);

    const disableSubtitles = React.useCallback(() => {
        setSubtitlesEnabled(false);
        setSelectedSubtitleKey(null);
    }, []);

    const startPlayback = React.useCallback(() => {
        if (!request?.sourceUrl || playbackStatus === 'loading') {
            return;
        }

        if (!selectedDevice) {
            return;
        }

        if (subtitlesEnabled && !selectedSubtitle) {
            return;
        }

        setPlaybackStatus('loading');
        const subtitle = subtitlesEnabled ?
            {
                ...selectedSubtitle,
                shiftMs: getShiftMs(subtitleShiftSeconds, subtitleShiftDirection),
            }
            :
            null;

        requestApi('/playback/sessions', {
            method: 'POST',
            body: JSON.stringify({
                deviceRegistryId: selectedDevice.id,
                sourceUrl: request.sourceUrl,
                subtitle,
            }),
        })
            .then(() => {
                toast.show({
                    type: 'success',
                    title: `${getDeviceTitle(selectedDevice)} uzerinde oynatiliyor`,
                    timeout: 4000,
                });

                if (typeof onCloseRequest === 'function') {
                    onCloseRequest();
                }
            })
            .catch((error) => {
                if (!mountedRef.current) {
                    return;
                }

                toast.show({
                    type: 'error',
                    title: error.message || 'TV uzerinde oynatma baslatilamadi',
                    timeout: 4000,
                });
            })
            .finally(() => {
                if (mountedRef.current) {
                    setPlaybackStatus('idle');
                }
            });
    }, [request, playbackStatus, selectedDevice, subtitlesEnabled, selectedSubtitle, subtitleShiftSeconds, subtitleShiftDirection, toast, onCloseRequest]);

    React.useEffect(() => {
        mountedRef.current = true;
        discoverSubtitles();
        setDevicesStatus('connecting');
        setDevices([]);
        setSelectedDeviceId(null);

        let socket;
        try {
            socket = new WebSocket(resolveWebSocketUrl('/discovery'));
        } catch (_error) {
            setDevicesStatus('error');
            return () => {
                mountedRef.current = false;
                subtitlesRequestIdRef.current += 1;
                closeDiscoverySocket();
            };
        }

        discoverySocketRef.current = socket;

        socket.onopen = () => {
            if (mountedRef.current && discoverySocketRef.current === socket) {
                setDevicesStatus('connected');
            }
        };

        socket.onmessage = (messageEvent) => {
            if (!mountedRef.current || discoverySocketRef.current !== socket) {
                return;
            }

            try {
                const message = JSON.parse(messageEvent.data);

                if (message.type === 'snapshot') {
                    setDevices(normalizeDevices(message.devices));
                    setDevicesStatus('connected');
                } else if (message.type === 'device.added') {
                    setDevices((devices) => upsertDevice(devices, message.device));
                    setDevicesStatus('connected');
                }
            } catch (_error) {
                setDevicesStatus('error');
            }
        };

        socket.onerror = () => {
            if (mountedRef.current && discoverySocketRef.current === socket) {
                setDevicesStatus('error');
            }
        };

        socket.onclose = () => {
            if (mountedRef.current && discoverySocketRef.current === socket) {
                discoverySocketRef.current = null;
                setDevicesStatus('disconnected');
            }
        };

        return () => {
            mountedRef.current = false;
            subtitlesRequestIdRef.current += 1;
            closeDiscoverySocket();
        };
    }, [request, discoverSubtitles, closeDiscoverySocket]);

    const subtitlesStartBlocked = subtitlesEnabled && (
        subtitlesStatus === 'loading' ||
        !selectedSubtitle
    );
    const startDisabled = !selectedDevice || subtitlesStartBlocked || playbackStatus === 'loading';
    const startButtonLabel = playbackStatus === 'loading' ? 'Baslatiliyor...' : 'TV\'de baslat';

    const buttons = React.useMemo(() => ([
        {
            label: 'Iptal',
            props: {
                onClick: onCloseRequest
            }
        },
        {
            label: startButtonLabel,
            icon: 'play',
            props: {
                disabled: startDisabled,
                onClick: startPlayback
            }
        }
    ]), [onCloseRequest, startButtonLabel, startDisabled, startPlayback]);

    return (
        <ModalDialog className={styles['play-on-tv-modal-container']} title={'TV\'de oynat'} buttons={buttons} onCloseRequest={onCloseRequest}>
            <div className={styles['content']}>
                <div className={styles['stream-summary']} title={request?.stream?.description || request?.sourceUrl}>
                    {request?.stream?.description || request?.sourceUrl}
                </div>
                <section className={styles['section']}>
                    <div className={styles['section-title']}>{'Cihaz'}</div>
                    <div className={styles['devices-list']}>
                        {
                            devices.length === 0 ?
                                <div className={styles['status']}>
                                    {
                                        devicesStatus === 'connecting' ?
                                            'TV cihazlari araniyor...'
                                            :
                                            devicesStatus === 'error' ?
                                                'TV cihazlari alinamadi'
                                                :
                                                devicesStatus === 'disconnected' ?
                                                    'TV cihaz baglantisi kapandi'
                                                    :
                                                    'TV cihazi bulunamadi'
                                    }
                                </div>
                                :
                                devices.map((device) => (
                                    <Button
                                        key={device.id}
                                        className={classnames(styles['option'], { selected: selectedDeviceId === device.id })}
                                        title={getDeviceTitle(device)}
                                        onClick={selectDevice(device)}
                                    >
                                        <Icon className={styles['option-icon']} name={'cast'} />
                                        <div className={styles['option-info']}>
                                            <div className={styles['option-title']}>{getDeviceTitle(device)}</div>
                                            {
                                                device.ipAddress ?
                                                    <div className={styles['option-description']}>{device.ipAddress}</div>
                                                    :
                                                    null
                                            }
                                        </div>
                                    </Button>
                                ))
                        }
                    </div>
                </section>
                <section className={styles['section']}>
                    <div className={styles['section-title']}>{'Altyazi'}</div>
                    <div className={styles['toggle-container']}>
                        <Button className={classnames(styles['toggle-option'], { selected: !subtitlesEnabled })} title={'Altyazi kapali'} onClick={disableSubtitles}>
                            {'Kapali'}
                        </Button>
                        <Button className={classnames(styles['toggle-option'], { selected: subtitlesEnabled })} title={'Altyazi acik'} onClick={enableSubtitles}>
                            {'Acik'}
                        </Button>
                    </div>
                    {
                        subtitlesEnabled ?
                            <React.Fragment>
                                <div className={styles['shift-direction-container']}>
                                    <Button
                                        className={classnames(styles['shift-direction-option'], { selected: subtitleShiftDirection === SHIFT_DIRECTION_EARLY })}
                                        title={'Altyazi erken gelsin'}
                                        onClick={setSubtitleShiftEarly}
                                    >
                                        {'Erken'}
                                    </Button>
                                    <Button
                                        className={classnames(styles['shift-direction-option'], { selected: subtitleShiftDirection === SHIFT_DIRECTION_DELAYED })}
                                        title={'Altyazi gec gelsin'}
                                        onClick={setSubtitleShiftDelayed}
                                    >
                                        {'Gecikmeli'}
                                    </Button>
                                </div>
                                <label className={styles['shift-container']}>
                                    <div className={styles['shift-label']}>{'Senkron (sn)'}</div>
                                    <TextInput
                                        className={styles['shift-input']}
                                        type={'text'}
                                        inputMode={'decimal'}
                                        value={subtitleShiftSeconds}
                                        onChange={subtitleShiftSecondsOnChange}
                                    />
                                </label>
                                {
                                    subtitlesStatus === 'loading' ?
                                        <div className={styles['status']}>{'Altyazilar yukleniyor...'}</div>
                                        :
                                        subtitlesStatus === 'missing' ?
                                            <div className={styles['status']}>{'Altyazi addonu bulunamadi'}</div>
                                            :
                                            subtitlesStatus === 'error' ?
                                                <div className={styles['status']}>{'Altyazilar alinamadi'}</div>
                                                :
                                                subtitlesStatus === 'empty' ?
                                                    <div className={styles['status']}>{'Altyazi bulunamadi'}</div>
                                                    :
                                                    <React.Fragment>
                                                        <SearchBar
                                                            className={styles['search-bar']}
                                                            title={'Altyazi ara'}
                                                            value={subtitleSearch}
                                                            onChange={subtitleSearchOnChange}
                                                        />
                                                        <div className={styles['subtitles-list']}>
                                                            {
                                                                filteredSubtitleOptions.length === 0 ?
                                                                    <div className={styles['status']}>{'Sonuc bulunamadi'}</div>
                                                                    :
                                                                    filteredSubtitleOptions.map((subtitle) => (
                                                                        <Button
                                                                            key={getSubtitleKey(subtitle)}
                                                                            className={classnames(styles['option'], { selected: selectedSubtitleKey === getSubtitleKey(subtitle) })}
                                                                            title={getSubtitleTitle(subtitle)}
                                                                            onClick={selectSubtitle(subtitle)}
                                                                        >
                                                                            <Icon className={styles['option-icon']} name={'subtitles'} />
                                                                            <div className={styles['option-info']}>
                                                                                <div className={styles['option-title']}>{subtitle.lang}</div>
                                                                                <div className={styles['option-description']}>{subtitle.id}</div>
                                                                            </div>
                                                                        </Button>
                                                                    ))
                                                            }
                                                        </div>
                                                    </React.Fragment>
                                }
                            </React.Fragment>
                            :
                            null
                    }
                </section>
            </div>
        </ModalDialog>
    );
};

PlayOnTvModal.propTypes = {
    request: PropTypes.shape({
        type: PropTypes.string,
        videoId: PropTypes.string,
        sourceUrl: PropTypes.string,
        stream: PropTypes.object,
        subtitleAddonTransportUrl: PropTypes.string,
        subtitleAddonManifest: PropTypes.object,
    }),
    onCloseRequest: PropTypes.func
};

module.exports = PlayOnTvModal;
