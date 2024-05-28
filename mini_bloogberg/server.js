const express = require('express');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');
const { exec } = require('child_process');

const YahooDataStreamer = require('./src/yahoodatastremer.js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

const yahooDataParser = new YahooDataStreamer((data) => {
    io.emit('priceUpdate', data);
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
    console.log('New client connected');
    
    socket.on('subscribe', (tickers) => {
        yahooDataParser.sendSubMsg(tickers);
    });

    socket.on('unsubscribe', (tickers) => {
        yahooDataParser.sendUnSubMsg(tickers);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
    const url = `http://localhost:${port}`;
    switch (process.platform) { 
        case 'darwin': 
            exec(`open ${url}`); 
            break;
        case 'win32': 
            exec(`start ${url}`); 
            break;
        default: 
            exec(`xdg-open ${url}`); 
            break;
    }
});
