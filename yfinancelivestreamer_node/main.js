'use strict';

const YahooDataStreamer = require('./src/yahoodatastremer.js');

async function callback_func(data) {
    console.log(parseFloat(data.time), data.id, data.price);
}

const yahooDataParser = new YahooDataStreamer(['NVDA', 'AAPL', 'GOOG', 'TSLA', 'AMZN']);
yahooDataParser.subscribeData(callback_func);
