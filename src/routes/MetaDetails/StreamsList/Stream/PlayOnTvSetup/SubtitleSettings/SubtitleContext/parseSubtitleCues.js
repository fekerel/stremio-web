// Copyright (C) 2017-2023 Smart code 203358507

const TIMESTAMP_SEPARATOR = '-->';

const parseTimestamp = (value) => {
    const match = String(value).trim().match(/^(?:(\d+):)?(\d{2}):(\d{2})[,.](\d{1,3})$/);

    if (match === null) {
        return null;
    }

    const hours = match[1] === undefined ? 0 : parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const seconds = parseInt(match[3], 10);
    const milliseconds = parseInt(match[4].padEnd(3, '0'), 10);

    return (((hours * 60 + minutes) * 60) + seconds) * 1000 + milliseconds;
};

const parseTimestampLine = (line) => {
    const parts = line.split(TIMESTAMP_SEPARATOR);

    if (parts.length < 2) {
        return null;
    }

    const startTime = parseTimestamp(parts[0]);
    const endTime = parseTimestamp(parts[1].trim().split(/\s+/)[0]);

    if (startTime === null || endTime === null || endTime <= startTime) {
        return null;
    }

    return {
        startTime,
        endTime
    };
};

const parseCueBlock = (block, index) => {
    const lines = block
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    const timestampLineIndex = lines.findIndex((line) => line.includes(TIMESTAMP_SEPARATOR));

    if (timestampLineIndex === -1) {
        return null;
    }

    const timestamps = parseTimestampLine(lines[timestampLineIndex]);

    if (timestamps === null) {
        return null;
    }

    const text = lines.slice(timestampLineIndex + 1).join('\n').trim();

    if (text.length === 0) {
        return null;
    }

    return {
        id: lines[0] && timestampLineIndex > 0 ? lines[0] : String(index),
        startTime: timestamps.startTime,
        endTime: timestamps.endTime,
        text
    };
};

const parseSubtitleCues = (text) => {
    if (typeof text !== 'string') {
        return [];
    }

    return text
        .replace(/^\uFEFF/, '')
        .replace(/\r\n?/g, '\n')
        .split(/\n{2,}/)
        .map((block) => block.trim())
        .filter((block) => block.length > 0)
        .filter((block) => !block.startsWith('WEBVTT') && !block.startsWith('NOTE') && !block.startsWith('STYLE'))
        .map(parseCueBlock)
        .filter((cue) => cue !== null);
};

module.exports = parseSubtitleCues;
