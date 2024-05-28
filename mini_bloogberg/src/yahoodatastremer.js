'use strict';

const WebSocket = require('ws');
const ProtoBufHandler = require('./protobufhandler.js');

class YahooDataStreamer {
    constructor(callback) {
        this.websocket_uri = 'wss://streamer.finance.yahoo.com/';
        this.callback = callback;
        this.bufHandler = new ProtoBufHandler('./yaticker.proto', 'yaticker');
        this.yahooFinanceWs = null;

        this.connect(this.callback);

    }

    sendSubMsg(tickers) {
        if (this.yahooFinanceWs && this.yahooFinanceWs.readyState === WebSocket.OPEN) {
            this.yahooFinanceWs.send(JSON.stringify({
                subscribe: tickers
            }));
        }

        else {
            console.log('WebSocket is not open. Cannot send message.');
        }
    }

    sendUnSubMsg(tickers) {
        if (this.yahooFinanceWs && this.yahooFinanceWs.readyState === WebSocket.OPEN) {
            this.yahooFinanceWs.send(JSON.stringify({
                unsubscribe: tickers
            }));
        }

        else {
            console.log('WebSocket is not open. Cannot send message.');
        };
    }

    processMsg(recvMsg, callback) {
        try {
            const decoded_msg = this.bufHandler.decodeBase64(recvMsg.toString());
            callback(decoded_msg);
            
        } 

        catch (err) {
            console.error('Error processing message:', err);
        }
    }

    connect(callback) {
        this.yahooFinanceWs = new WebSocket(this.websocket_uri);

        this.yahooFinanceWs.on('open', () => {
            console.log('Connected to the server');
        });

        this.yahooFinanceWs.on('message', async (recvMsg) => {
            try {
                this.processMsg(recvMsg, callback);

            } 
            
            catch (error) {
                console.error('Error processing message:', error);
            }
        });

        this.yahooFinanceWs.on('close', () => {
            console.log('Disconnected from the server');
            this.reconnect();
        });

        this.yahooFinanceWs.on('error', (error) => {
            console.error('WebSocket error:', error);
            this.reconnect();
        });
    }

    reconnect() {
        console.log('Attempting to reconnect...');
        setTimeout(() => this.connect(), 1000); 
    }
}

module.exports = YahooDataStreamer;