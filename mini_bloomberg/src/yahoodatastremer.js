'use strict';

const WebSocket = require('ws');
const ProtoBufHandler = require('./protobufhandler.js');

class YahooDataStreamer {
    constructor(callback) {
        this.websocket_uri = 'wss://streamer.finance.yahoo.com/';
        this.callback = callback;
        this.bufHandler = new ProtoBufHandler('./yaticker.proto', 'yaticker');
        this.yahooFinanceWs = null;
        this.subscribedTickers = [];

        this.connect(this.callback);
    }

    sendSubMsg(tickers) {
        if (this.yahooFinanceWs && this.yahooFinanceWs.readyState === WebSocket.OPEN) {
            this.yahooFinanceWs.send(JSON.stringify({
                subscribe: tickers
            }));
            this.subscribedTickers.push(...tickers);
        } else {
            console.log('YahooFinance WebSocket is not open. Cannot send message.');
        }
    }

    sendUnSubMsg(tickers) {
        if (this.yahooFinanceWs && this.yahooFinanceWs.readyState === WebSocket.OPEN) {
            this.yahooFinanceWs.send(JSON.stringify({
                unsubscribe: tickers
            }));
            this.subscribedTickers = this.subscribedTickers.filter(ticker => !tickers.includes(ticker)); // Remove unsubscribed tickers
        } else {
            console.log('YahooFinance WebSocket is not open. Cannot send message.');
        }
    }

    processMsg(recvMsg, callback) {
        try {
            const decoded_msg = this.bufHandler.decodeBase64(recvMsg.toString());
            callback(decoded_msg);
        } catch (err) {
            console.error('Error processing message:', err);
        }
    }

    connect(callback) {
        this.yahooFinanceWs = new WebSocket(this.websocket_uri);

        this.yahooFinanceWs.on('open', () => {
            console.log('Connected to the YahooFinance server');
            if (this.subscribedTickers.length > 0) {
                this.sendSubMsg(this.subscribedTickers);
            }
        });

        this.yahooFinanceWs.on('message', async (recvMsg) => {
            try {
                this.processMsg(recvMsg, callback);
            } catch (error) {
                console.error('Error processing message:', error);
            }
        });

        this.yahooFinanceWs.on('close', () => {
            console.log('Disconnected from the YahooFinance server');
            this.reconnect();
        });

        this.yahooFinanceWs.on('error', (error) => {
            console.error('YahooFinance WebSocket error:', error);
            this.reconnect();
        });
    }

    reconnect() {
        console.log('YahooFinance Attempting to reconnect YahooFinance...');
        setTimeout(() => this.connect(this.callback), 1000); 
    }
}

module.exports = YahooDataStreamer;
