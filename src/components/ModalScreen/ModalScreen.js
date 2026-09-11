// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const { useTranslation } = require('react-i18next');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const { useModalsContainer } = require('stremio/router/ModalsContainerContext');
const Modal = require('stremio/router/Modal');
const { default: useRouteFocused } = require('stremio/common/useRouteFocused');
const { default: Button } = require('stremio/components/Button');
const { default: Icon } = require('@stremio/stremio-icons/react');
const styles = require('./styles');

const ModalScreen = ({ className, title, children, dataset, backButtonVisible, onBackRequest, onCloseRequest, ...props }) => {
    const { t } = useTranslation();
    const routeFocused = useRouteFocused();
    const modalsContainer = useModalsContainer();
    const modalContainerRef = React.useRef(null);

    const close = React.useCallback((event) => {
        if (typeof onCloseRequest === 'function') {
            onCloseRequest({
                type: 'close',
                dataset,
                reactEvent: event.nativeEvent ? event : null,
                nativeEvent: event.nativeEvent || event
            });
        }
    }, [dataset, onCloseRequest]);

    const backButtonOnClick = React.useCallback((event) => {
        if (typeof onBackRequest === 'function') {
            onBackRequest({
                type: 'back',
                dataset,
                reactEvent: event,
                nativeEvent: event.nativeEvent
            });
        }
    }, [dataset, onBackRequest]);

    const modalOnMouseDown = React.useCallback((event) => {
        if (!event.nativeEvent.closeModalScreenPrevented) {
            close(event);
        }
    }, [close]);

    const contentOnMouseDown = React.useCallback((event) => {
        event.nativeEvent.closeModalScreenPrevented = true;
    }, []);

    React.useEffect(() => {
        const onKeyDown = (event) => {
            if (event.code === 'Escape' && modalsContainer.childNodes[modalsContainer.childElementCount - 2] === modalContainerRef.current) {
                close(event);
            }
        };

        if (routeFocused) {
            window.addEventListener('keydown', onKeyDown);
        }

        return () => {
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [routeFocused, modalsContainer, close]);

    return (
        <Modal ref={modalContainerRef} {...props} className={classnames(className, styles['modal-screen-container'])} onMouseDown={modalOnMouseDown}>
            <div className={styles['modal-screen-content']} onMouseDown={contentOnMouseDown}>
                <div className={styles['top-bar']}>
                    {
                        backButtonVisible ?
                            <Button className={classnames(styles['button-container'], styles['back-button-container'])} title={t('BACK')} onClick={backButtonOnClick}>
                                <Icon className={styles['icon']} name={'chevron-back'} />
                            </Button>
                            :
                            <div className={styles['button-placeholder']} />
                    }
                    {
                        typeof title === 'string' && title.length > 0 ?
                            <div className={styles['title-container']} title={title}>{title}</div>
                            :
                            <div className={styles['title-container']} />
                    }
                    <Button className={classnames(styles['button-container'], styles['close-button-container'])} title={t('BUTTON_CLOSE')} onClick={close}>
                        <Icon className={styles['icon']} name={'close'} />
                    </Button>
                </div>
                <div className={styles['body-container']}>
                    {children}
                </div>
            </div>
        </Modal>
    );
};

ModalScreen.propTypes = {
    className: PropTypes.string,
    title: PropTypes.string,
    children: PropTypes.node,
    dataset: PropTypes.object,
    backButtonVisible: PropTypes.bool,
    onBackRequest: PropTypes.func,
    onCloseRequest: PropTypes.func
};

module.exports = ModalScreen;
