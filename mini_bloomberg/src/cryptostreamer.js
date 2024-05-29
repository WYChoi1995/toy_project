'use strict';

const WebSocket = require('ws');


class BinanceDataStreamer {
    constructor(callback) {
        this.websocket_uri = 'wss://stream.binance.com:9443/ws';
        this.callback = callback;
        this.binanceWs = null;
        this.subscribedTickers = [];

        this.connect(this.callback);
    }

    sendSubMsg(tickers) {
        if (this.binanceWs && this.binanceWs.readyState === WebSocket.OPEN) {
            this.binanceWs.send(JSON.stringify({
                method: "SUBSCRIBE",
                id: 1,
                params: tickers.map(ticker => ticker.toLowerCase() + '@ticker')
            }));
            this.subscribedTickers.push(...tickers);
        } else {
            console.log('WebSocket is not open. Cannot send message.');
        }
    }

    sendUnSubMsg(tickers) {
        if (this.binanceWs && this.binanceWs.readyState === WebSocket.OPEN) {
            this.binanceWs.send(JSON.stringify({
                method: "UNSUBSCRIBE",
                id: 1,
                params: tickers.map(ticker => ticker.toLowerCase() + '@ticker')
            }));
            this.subscribedTickers = this.subscribedTickers.filter(ticker => !tickers.includes(ticker));
        } else {
            console.log('WebSocket is not open. Cannot send message.');
        }
    }

    processMsg(recvMsg, callback) {
        try {
            callback(JSON.parse(recvMsg));
        } 
        
        catch (err) {
            console.error('Error processing message:', err);
        }
    }

    connect(callback) {
        this.binanceWs = new WebSocket(this.websocket_uri);

        this.binanceWs.on('open', () => {
            console.log('Connected to the Binance server');
            if (this.subscribedTickers.length > 0) {
                this.sendSubMsg(this.subscribedTickers);
            }
        });

        this.binanceWs.on('message', async (recvMsg) => {
            try {
                this.processMsg(recvMsg, callback);
            } catch (error) {
                console.error('Error processing message:', error);
            }
        });

        this.binanceWs.on('close', () => {
            console.log('Disconnected from the Binance server');
            this.reconnect();
        });

        this.binanceWs.on('error', (error) => {
            console.error('Binance WebSocket error:', error);
            this.reconnect();
        });
    }

    reconnect() {
        console.log('Attempting to reconnect Binance...');
        setTimeout(() => this.connect(this.callback), 1000); 
    }
}

module.exports = BinanceDataStreamer;
