'use strict';

const YahooDataStreamer = require('./src/yahoodatastremer.js');

const yahooDataParser = new YahooDataStreamer(['BTC-USD']);
yahooDataParser.subscribeData();
