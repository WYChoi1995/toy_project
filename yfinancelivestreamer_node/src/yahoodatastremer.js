'use strict';

const WebSocket = require('ws');
const ProtoBufHandler = require('./protobufhandler.js');

class YahooDataStreamer {
    constructor(tickers) {
        this.websocket_uri = 'wss://streamer.finance.yahoo.com/';
        this.tickers = tickers;
        this.bufHandler = new ProtoBufHandler('./src/yaticker.proto', 'yaticker');
    }

    makeSubscribeMsg() {
        return JSON.stringify({
            subscribe: this.tickers
        });
    }

    async processMsg(recvMsg, callback) {
        try {
            const decoded_msg = this.bufHandler.decodeBase64(recvMsg.toString());
            await callback(decoded_msg);
            
        } 

        catch (err) {
            console.error('Error processing message:', err);
        }
    }

    async subscribeData(callback) {
        const yahooFinanceWs = new WebSocket(this.websocket_uri);

        yahooFinanceWs.on('open', () => {
            yahooFinanceWs.send(this.makeSubscribeMsg());
        });

        yahooFinanceWs.on('message', async (recvMsg) => {
            try {
                await this.processMsg(recvMsg, callback);

            } 
            
            catch (error) {
                console.error('Error processing message:', error);
            }
        });

        yahooFinanceWs.on('close', () => {
            console.log('WebSocket connection closed, retrying in 1 second...');
            setTimeout(() => this.subscribeData(callback), 1000);
        });

        yahooFinanceWs.on('error', (error) => {
            console.error('WebSocket error:', error);
            setTimeout(() => this.subscribeData(callback), 1000);
        });
    }
}

module.exports = YahooDataStreamer;