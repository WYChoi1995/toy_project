const express = require('express');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');

const YahooDataStreamer = require('./src/yahoodatastremer.js');
const CryptoDataStreamer = require('./src/cryptostreamer.js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

const yahooDataParser = new YahooDataStreamer((data) => {
    io.emit('priceUpdate', data);
});
const cryptoDataParser = new CryptoDataStreamer((data) => {
    io.emit('cryptoPriceUpdate', data);
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
    console.log('New client connected');
    
    socket.on('tradfiSubscribe', (tickers) => {
        yahooDataParser.sendSubMsg(tickers);
    });

    socket.on('cryptoSubscribe', (tickers) => {
        cryptoDataParser.sendSubMsg(tickers)
    });

    socket.on('tradfiUnsubscribe', (tickers) => {
        yahooDataParser.sendUnSubMsg(tickers);
    });

    socket.on('cryptoUnsubscribe', (tickers) => {
        cryptoDataParser.sendUnSubMsg(tickers)
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server running on port ${port}`);

});
