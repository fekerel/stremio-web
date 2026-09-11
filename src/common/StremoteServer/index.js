// Copyright (C) 2017-2023 Smart code 203358507

const client = require('./client');
const useStremoteRequest = require('./useStremoteRequest');
const useStremoteSocket = require('./useStremoteSocket');

module.exports = {
    ...client,
    useStremoteRequest,
    useStremoteSocket
};
