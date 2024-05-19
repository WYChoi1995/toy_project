'use strict';

const WebSocket = require('ws');
const ProtoBufHandler = require('./protobufhandler.js');


class YahooDataStreamer {
    constructor(tickers) {
        this.websocket_uri = 'wss://streamer.finance.yahoo.com/';
        this.tickers = tickers;
        this.bufHandler = new ProtoBufHandler('./src/yfin.proto');
    }
    
    async test() {
        const decoded_msg = await this.bufHandler.decode(Buffer.from('CgVLUlc9WBWFW6hEGJCgpJ7wYyoDQ0NZMA44AUVwq7G+ZQAVlsC9AYVbqETNAYV7qETYAQg=', 'base64'));
        console.log(decoded_msg.price);
    }

    makeSubscribeMsg() {
        return JSON.stringify({
            subscribe: this.tickers
        });
    }

    async processMsg(recvMsg) {
        const decoded_msg =  await bufHandler.decode(Buffer.from(recvMsg, 'base64'));

        console.log(decoded_msg);
    }

    async subscribeData() {
        const yahooFinanceWs = new WebSocket(this.websocket_uri);

        yahooFinanceWs.on('open', () => {
            yahooFinanceWs.send(this.makeSubscribeMsg());
        });

        yahooFinanceWs.on('message', async (recvMsg) => {
            try {
                await this.processMsg(recvMsg);
            }
            
            catch(error) {

            }
        });

        yahooFinanceWs.on('close',  () => {
            setTimeout(() => this.subscribeData(), 1000);
        });

        yahooFinanceWs.on('error', () => {
            setTimeout(() => this.subscribeData(), 1000);
        });
    }
    
}

module.exports = YahooDataStreamer;