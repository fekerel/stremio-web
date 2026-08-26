// Copyright (C) 2017-2026 Smart code 203358507

const copyText = (text) => {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
    }

    let copied = false;
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.opacity = '0';

    const onCopy = (event) => {
        event.preventDefault();

        if (event.clipboardData) {
            event.clipboardData.setData('text/plain', text);
            copied = true;
        }
    };

    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    document.addEventListener('copy', onCopy);

    const commandSucceeded = document.execCommand('copy');

    document.removeEventListener('copy', onCopy);
    textarea.remove();

    return commandSucceeded && copied ?
        Promise.resolve()
        :
        Promise.reject(new Error('Clipboard unavailable'));
};

module.exports = copyText;
