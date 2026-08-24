// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { default: Icon } = require('@stremio/stremio-icons/react');
const { t } = require('i18next');
const { useCore } = require('stremio/core');
const { useProfile, usePlatform, useToast, useBinaryState } = require('stremio/common');
const { Button, Image, Popup } = require('stremio/components');
const { WS_BASE_URL } = require('stremio/common/config');
const { request } = require('stremio/common/apiClient');
const { default: useRouteFocused } = require('stremio/common/useRouteFocused');
const StreamPlaceholder = require('./StreamPlaceholder');
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

const Stream = ({ className, videoId, videoReleased, addonName, name, description, thumbnail, progress, deepLinks, ...props }) => {
    const profile = useProfile();
    const toast = useToast();
    const platform = usePlatform();
    const core = useCore();
    const routeFocused = useRouteFocused();

    const [menuOpen, openMenu, closeMenu, toggleMenu] = useBinaryState(false);
    const discoverySocketRef = React.useRef(null);
    const [tvDevicesOpen, setTvDevicesOpen] = React.useState(false);
    const [tvDevicesStatus, setTvDevicesStatus] = React.useState('idle');
    const [tvDevices, setTvDevices] = React.useState([]);
    const [playbackDeviceId, setPlaybackDeviceId] = React.useState(null);

    const popupLabelOnMouseUp = React.useCallback((event) => {
        if (!event.nativeEvent.togglePopupPrevented) {
            if (event.nativeEvent.ctrlKey || event.nativeEvent.button === 2) {
                event.preventDefault();
                openMenu();
            }
        }
    }, [openMenu]);
    const popupLabelOnContextMenu = React.useCallback((event) => {
        if (!event.nativeEvent.togglePopupPrevented && !event.nativeEvent.ctrlKey && !event.nativeEvent.shiftKey) {
            event.preventDefault();
        }
    }, [toggleMenu]);
    const popupLabelOnLongPress = React.useCallback((event) => {
        if (event.nativeEvent.pointerType !== 'mouse' && !event.nativeEvent.togglePopupPrevented) {
            toggleMenu();
        }
    }, [toggleMenu]);
    const popupMenuOnPointerDown = React.useCallback((event) => {
        event.nativeEvent.togglePopupPrevented = true;
    }, []);
    const popupMenuOnContextMenu = React.useCallback((event) => {
        event.nativeEvent.togglePopupPrevented = true;
        if (!event.nativeEvent.ctrlKey && !event.nativeEvent.shiftKey) {
            event.preventDefault();
        }
    }, []);
    const popupMenuOnClick = React.useCallback((event) => {
        event.nativeEvent.togglePopupPrevented = true;
    }, []);
    const popupMenuOnKeyDown = React.useCallback((event) => {
        event.nativeEvent.buttonClickPrevented = true;
    }, []);

    const href = React.useMemo(() => {
        return deepLinks ?
            deepLinks.externalPlayer ?
                deepLinks.externalPlayer.web ?
                    deepLinks.externalPlayer.web
                    :
                    deepLinks.externalPlayer.openPlayer ?
                        deepLinks.externalPlayer.openPlayer[platform.name] ?
                            deepLinks.externalPlayer.openPlayer[platform.name]
                            :
                            deepLinks.externalPlayer.playlist
                        :
                        deepLinks.player
                :
                deepLinks.player
            :
            null;
    }, [deepLinks]);

    const download = React.useMemo(() => {
        return href === deepLinks?.externalPlayer?.playlist ?
            deepLinks.externalPlayer.fileName
            :
            null;
    }, [href, deepLinks]);

    const target = React.useMemo(() => {
        return href === deepLinks?.externalPlayer?.web ?
            '_blank'
            :
            null;
    }, [href, deepLinks]);

    const streamLink = React.useMemo(() => {
        return deepLinks?.externalPlayer?.streaming;
    }, [deepLinks]);

    const downloadLink = React.useMemo(() => {
        return deepLinks?.externalPlayer?.download;
    }, [deepLinks]);

    const magnetLink = React.useMemo(() => {
        return deepLinks?.externalPlayer?.magnet;
    }, [deepLinks]);

    const markVideoAsWatched = React.useCallback(() => {
        if (typeof videoId === 'string') {
            core.transport.dispatch({
                action: 'MetaDetails',
                args: {
                    action: 'MarkVideoAsWatched',
                    args: [{ id: videoId, released: videoReleased }, true]
                }
            });
        }
    }, [videoId, videoReleased]);

    const onClick = React.useCallback((event) => {
        if (event.nativeEvent.togglePopupPrevented) {
            return;
        }

        if (profile.settings.playerType !== null) {
            markVideoAsWatched();
            toast.show({
                type: 'success',
                title: 'Stream opened in external player',
                timeout: 4000
            });
        }

        if (typeof props.onClick === 'function') {
            props.onClick(event);
        }
    }, [props.onClick, profile.settings, markVideoAsWatched]);

    const copyMagnetLink = React.useCallback((event) => {
        event.preventDefault();
        closeMenu();
        if (magnetLink) {
            navigator.clipboard.writeText(magnetLink)
                .then(() => {
                    toast.show({
                        type: 'success',
                        title: t('PLAYER_COPY_MAGNET_LINK_SUCCESS'),
                        timeout: 4000
                    });
                })
                .catch(() => {
                    toast.show({
                        type: 'error',
                        title: t('PLAYER_COPY_MAGNET_LINK_ERROR'),
                        timeout: 4000,
                    });
                });
        }
    }, [magnetLink]);

    const copyDownloadLink = React.useCallback((event) => {
        event.preventDefault();
        closeMenu();
        if (downloadLink) {
            navigator.clipboard.writeText(downloadLink)
                .then(() => {
                    toast.show({
                        type: 'success',
                        title: t('PLAYER_COPY_DOWNLOAD_LINK_SUCCESS'),
                        timeout: 4000
                    });
                })
                .catch(() => {
                    toast.show({
                        type: 'error',
                        title: t('PLAYER_COPY_DOWNLOAD_LINK_ERROR'),
                        timeout: 4000,
                    });
                });
        }
    }, [downloadLink]);

    const copyStreamLink = React.useCallback((event) => {
        event.preventDefault();
        closeMenu();
        if (streamLink) {
            navigator.clipboard.writeText(streamLink)
                .then(() => {
                    toast.show({
                        type: 'success',
                        title: t('PLAYER_COPY_STREAM_SUCCESS'),
                        timeout: 4000
                    });
                })
                .catch(() => {
                    toast.show({
                        type: 'error',
                        title: t('PLAYER_COPY_STREAM_ERROR'),
                        timeout: 4000,
                    });
                });
        }
    }, [streamLink]);

    const closeDeviceDiscovery = React.useCallback(() => {
        if (discoverySocketRef.current !== null) {
            discoverySocketRef.current.close();
            discoverySocketRef.current = null;
        }

        setTvDevicesOpen(false);
        setTvDevicesStatus('idle');
        setTvDevices([]);
    }, []);

    const openDeviceDiscovery = React.useCallback((event) => {
        event.preventDefault();
        setTvDevicesOpen(true);

        if (!streamLink) {
            toast.show({
                type: 'error',
                title: 'Stream source URL bulunamadi',
                timeout: 4000,
            });
            return;
        }

        if (
            discoverySocketRef.current !== null &&
            (
                discoverySocketRef.current.readyState === WebSocket.OPEN ||
                discoverySocketRef.current.readyState === WebSocket.CONNECTING
            )
        ) {
            return;
        }

        setTvDevicesStatus('connecting');
        setTvDevices([]);

        const socket = new WebSocket(resolveWebSocketUrl('/discovery'));
        discoverySocketRef.current = socket;

        socket.onopen = () => {
            if (discoverySocketRef.current === socket) {
                setTvDevicesStatus('connected');
            }
        };

        socket.onmessage = (messageEvent) => {
            if (discoverySocketRef.current !== socket) {
                return;
            }

            try {
                const message = JSON.parse(messageEvent.data);

                if (message.type === 'snapshot') {
                    setTvDevices(normalizeDevices(message.devices));
                    setTvDevicesStatus('connected');
                } else if (message.type === 'device.added') {
                    setTvDevices((devices) => upsertDevice(devices, message.device));
                    setTvDevicesStatus('connected');
                }
            } catch (_error) {
                setTvDevicesStatus('error');
                toast.show({
                    type: 'error',
                    title: 'TV cihaz mesaji okunamadi',
                    timeout: 4000,
                });
            }
        };

        socket.onerror = () => {
            if (discoverySocketRef.current === socket) {
                setTvDevicesStatus('error');
            }
        };

        socket.onclose = () => {
            if (discoverySocketRef.current === socket) {
                discoverySocketRef.current = null;
                setTvDevicesStatus('disconnected');
            }
        };
    }, [streamLink, toast]);

    const playOnTv = React.useCallback((device) => (event) => {
        event.preventDefault();

        if (!streamLink) {
            toast.show({
                type: 'error',
                title: 'Stream source URL bulunamadi',
                timeout: 4000,
            });
            return;
        }

        setPlaybackDeviceId(device.id);
        request('/playback/sessions', {
            method: 'POST',
            body: JSON.stringify({
                deviceRegistryId: device.id,
                sourceUrl: streamLink,
            }),
        })
            .then(() => {
                toast.show({
                    type: 'success',
                    title: `${device.friendlyName || device.ipAddress || 'TV'} uzerinde oynatiliyor`,
                    timeout: 4000,
                });
                closeMenu();
                closeDeviceDiscovery();
            })
            .catch((error) => {
                toast.show({
                    type: 'error',
                    title: error.message || 'TV uzerinde oynatma baslatilamadi',
                    timeout: 4000,
                });
            })
            .finally(() => {
                setPlaybackDeviceId(null);
            });
    }, [streamLink, closeDeviceDiscovery]);

    const renderThumbnailFallback = React.useCallback(() => (
        <Icon className={styles['placeholder-icon']} name={'ic_broken_link'} />
    ), []);

    const renderLabel = React.useMemo(() => function renderLabel({ className, children, ...props }) {
        return (
            <Button className={classnames(className, styles['stream-container'])} title={addonName} href={href} target={target} download={download} onClick={onClick} {...props}>
                <div className={styles['info-container']}>
                    {
                        typeof thumbnail === 'string' && thumbnail.length > 0 ?
                            <div className={styles['thumbnail-container']} title={name || addonName}>
                                <Image
                                    className={styles['thumbnail']}
                                    src={thumbnail}
                                    alt={' '}
                                    renderFallback={renderThumbnailFallback}
                                />
                            </div>
                            :
                            <div className={styles['addon-name-container']} title={name || addonName}>
                                <div className={styles['addon-name']}>{name || addonName}</div>
                            </div>
                    }
                    {
                        progress !== null && !isNaN(progress) && progress > 0 ?
                            <div className={styles['progress-bar-container']}>
                                <div className={styles['progress-bar']} style={{ width: `${progress}%` }} />
                                <div className={styles['progress-bar-background']} />
                            </div>
                            :
                            null
                    }
                </div>
                <div className={styles['description-container']} title={description}>{description}</div>
                <Icon className={styles['icon']} name={'play'} />
                {children}
            </Button>
        );
    }, [thumbnail, progress, addonName, name, description, href, target, download, onClick]);

    const renderMenu = React.useMemo(() => function renderMenu() {
        return (
            <div className={styles['context-menu-content']} onPointerDown={popupMenuOnPointerDown} onContextMenu={popupMenuOnContextMenu} onClick={popupMenuOnClick} onKeyDown={popupMenuOnKeyDown}>
                <div className={styles['context-menu-title']}>
                    {description}
                </div>
                <Button className={styles['context-menu-option-container']} title={t('CTX_PLAY')}>
                    <Icon className={styles['menu-icon']} name={'play'} />
                    <div className={styles['context-menu-option-label']}>{t('CTX_PLAY')}</div>
                </Button>
                <Button className={styles['context-menu-option-container']} title={'TV\'de oynat'} onClick={openDeviceDiscovery}>
                    <Icon className={styles['menu-icon']} name={'tv'} />
                    <div className={styles['context-menu-option-label']}>{'TV\'de oynat'}</div>
                </Button>
                {
                    tvDevicesOpen ?
                        <div className={styles['context-menu-devices-container']}>
                            {
                                tvDevices.length === 0 ?
                                    <div className={styles['context-menu-status']}>
                                        {
                                            tvDevicesStatus === 'connecting' ?
                                                'TV cihazlari araniyor...'
                                                :
                                                tvDevicesStatus === 'error' ?
                                                    'TV cihazlari alinamadi'
                                                    :
                                                    tvDevicesStatus === 'disconnected' ?
                                                        'TV cihaz baglantisi kapandi'
                                                        :
                                                        'TV cihazi bulunamadi'
                                        }
                                    </div>
                                    :
                                    tvDevices.map((device) => (
                                        <Button
                                            key={device.id}
                                            className={styles['context-menu-option-container']}
                                            title={device.friendlyName || device.ipAddress || device.id}
                                            onClick={playOnTv(device)}
                                        >
                                            <Icon className={styles['menu-icon']} name={'cast'} />
                                            <div className={styles['context-menu-device-info']}>
                                                <div className={styles['context-menu-device-name']}>
                                                    {device.friendlyName || device.ipAddress || device.id}
                                                </div>
                                                {
                                                    device.ipAddress ?
                                                        <div className={styles['context-menu-device-address']}>
                                                            {playbackDeviceId === device.id ? 'Gonderiliyor...' : device.ipAddress}
                                                        </div>
                                                        :
                                                        null
                                                }
                                            </div>
                                        </Button>
                                    ))
                            }
                        </div>
                        :
                        null
                }
                {
                    streamLink &&
                        <Button className={styles['context-menu-option-container']} title={t('CTX_COPY_STREAM_LINK')} onClick={copyStreamLink}>
                            <Icon className={styles['menu-icon']} name={'link'} />
                            <div className={styles['context-menu-option-label']}>{t('CTX_COPY_STREAM_LINK')}</div>
                        </Button>
                }
                {
                    magnetLink &&
                        <Button className={styles['context-menu-option-container']} title={t('CTX_COPY_MAGNET_LINK')} onClick={copyMagnetLink}>
                            <Icon className={styles['menu-icon']} name={'magnet-link'} />
                            <div className={styles['context-menu-option-label']}>{t('CTX_COPY_MAGNET_LINK')}</div>
                        </Button>
                }
                {
                    downloadLink &&
                        <Button className={styles['context-menu-option-container']} title={t('CTX_DOWNLOAD_VIDEO')} onClick={copyDownloadLink}>
                            <Icon className={styles['menu-icon']} name={'download'} />
                            <div className={styles['context-menu-option-label']}>{t('CTX_COPY_VIDEO_DOWNLOAD_LINK')}</div>
                        </Button>
                }
            </div>
        );
    }, [description, streamLink, tvDevicesOpen, tvDevices, tvDevicesStatus, playbackDeviceId, popupMenuOnPointerDown, popupMenuOnContextMenu, popupMenuOnClick, popupMenuOnKeyDown, openDeviceDiscovery, playOnTv, copyStreamLink, copyMagnetLink, copyDownloadLink, magnetLink, downloadLink]);

    React.useEffect(() => {
        if (!routeFocused) {
            closeMenu();
        }
    }, [routeFocused]);

    React.useEffect(() => {
        if (!menuOpen) {
            closeDeviceDiscovery();
        }
    }, [menuOpen]);

    React.useEffect(() => {
        return () => {
            closeDeviceDiscovery();
        };
    }, []);

    return (
        <Popup
            className={className}
            onMouseUp={popupLabelOnMouseUp}
            onLongPress={popupLabelOnLongPress}
            onContextMenu={popupLabelOnContextMenu}
            open={menuOpen}
            onCloseRequest={closeMenu}
            renderLabel={renderLabel}
            renderMenu={renderMenu}
        />
    );
};

Stream.Placeholder = StreamPlaceholder;

Stream.propTypes = {
    className: PropTypes.string,
    videoId: PropTypes.string,
    videoReleased: PropTypes.instanceOf(Date),
    addonName: PropTypes.string,
    name: PropTypes.string,
    description: PropTypes.string,
    thumbnail: PropTypes.string,
    progress: PropTypes.number,
    deepLinks: PropTypes.shape({
        player: PropTypes.string,
        externalPlayer: PropTypes.shape({
            download: PropTypes.string,
            magnet: PropTypes.string,
            streaming: PropTypes.string,
            playlist: PropTypes.string,
            fileName: PropTypes.string,
            web: PropTypes.string,
            openPlayer: PropTypes.shape({
                ios: PropTypes.string,
                android: PropTypes.string,
                windows: PropTypes.string,
                macos: PropTypes.string,
                linux: PropTypes.string,
            })
        })
    }),
    onClick: PropTypes.func
};

module.exports = Stream;
