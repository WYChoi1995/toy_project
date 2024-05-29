document.addEventListener("DOMContentLoaded", function() {
    const priceTable = document.getElementById("priceTable").getElementsByTagName('tbody')[0];
    const subscriptionList = document.getElementById("subscriptionList");
    const consoleLog = document.getElementById("consoleLog");
    const addButton = document.getElementById("addButton");
    const tickerInput = document.getElementById("tickerInput");

    const socket = io();

    function addTickers() {

        const tickers = tickerInput.value.toUpperCase().split(',').map(ticker => ticker.trim());
        tickers.forEach(ticker => {
            if (ticker && !isTickerSubscribed(ticker)) {
                addSubscription(ticker);
                addTableRow(ticker);

                if (ticker.endsWith("USDT")){
                    socket.emit('cryptoSubscribe', [ticker]);
                }

                else{
                    socket.emit('subscribe', [ticker]);
                }
                    
            } else {

            }
        });
        tickerInput.value = "";
    }

    addButton.addEventListener("click", addTickers);

    tickerInput.addEventListener("keydown", function(event) {
        if (event.key === "Enter") {
            addTickers();
        }
    });

    function isTickerSubscribed(ticker) {
        const listItems = subscriptionList.getElementsByTagName("li");
        for (let i = 0; i < listItems.length; i++) {
            if (listItems[i].textContent === ticker) {
                return true;
            }
        }
        return false;
    }

    function addSubscription(ticker) {
        const listItem = document.createElement("li");
        listItem.textContent = ticker;
        listItem.addEventListener("click", function() {
            subscriptionList.removeChild(listItem);
            removeTableRow(ticker);
            logConsole(`Unsubscribed from ${ticker}`);

            if (ticker.endsWith("USDT")){
                socket.emit('cryptoUnsubscribe', [ticker]);
            }

            else{
                socket.emit('unsubscribe', [ticker]);
            }
        });
        subscriptionList.appendChild(listItem);
        logConsole(`Subscribed to ${ticker}`);
    }

    function addTableRow(ticker) {
        const row = priceTable.insertRow();
        row.setAttribute('data-ticker', ticker);
        row.insertCell(0).textContent = "-";
        row.insertCell(1).textContent = ticker;
        row.insertCell(2).textContent = "-";
        row.insertCell(3).textContent = "-";
        row.insertCell(4).textContent = "-";
    }

    function removeTableRow(ticker) {
        const rows = priceTable.querySelectorAll('tr[data-ticker]');
        rows.forEach(row => {
            if (row.getAttribute('data-ticker') === ticker) {
                priceTable.deleteRow(row.rowIndex - 1);
            }
        });
    }

    function logConsole(message) {
        const logMessage = document.createElement("div");
        logMessage.textContent = message;
        consoleLog.appendChild(logMessage);
    }

    function convertUnixTimestampToDatetime(unixTimestamp) {
        const date = new Date(parseInt(unixTimestamp));
        return date.toISOString(); 
    }

    function formatPrice(price) {
        return parseFloat(price).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    }

    socket.on('priceUpdate', (data) => {
        const rows = priceTable.querySelectorAll('tr[data-ticker]');
        rows.forEach(row => {
            if (row.getAttribute('data-ticker') === data.id) {
                const formattedTime = convertUnixTimestampToDatetime(data.time);
                const formattedPrice = formatPrice(data.price);
                const formmatedChange = formatPrice(data.change);
                
                row.cells[0].textContent = formattedTime;
                const priceCell = row.cells[2];
                priceCell.textContent = formattedPrice;
                row.cells[3].textContent = formmatedChange;
                row.cells[4].textContent = data.changePercent.toFixed(4);

                const priceColorClass = data.change < 0 ? 'change-negative' : 'change-positive';
                row.cells[2].className = priceColorClass;
                row.cells[3].className = priceColorClass;
                row.cells[4].className = priceColorClass;

                priceCell.classList.add('twinkle');
                setTimeout(() => {
                    priceCell.classList.remove('twinkle');
                }, 500);
            }
        });
    });

    socket.on('cryptoPriceUpdate', (data) => {
        const rows = priceTable.querySelectorAll('tr[data-ticker]');
        rows.forEach(row => {
            if (row.getAttribute('data-ticker') === data.s) {
                const formattedTime = convertUnixTimestampToDatetime(data.E);
                const formattedPrice = formatPrice(data.c);
                const formmatedChange = formatPrice(data.p);
                
                row.cells[0].textContent = formattedTime;
                const priceCell = row.cells[2];
                priceCell.textContent = formattedPrice;
                row.cells[3].textContent = formmatedChange;
                row.cells[4].textContent = parseFloat(data.P).toFixed(4);

                const priceColorClass = formmatedChange < 0 ? 'change-negative' : 'change-positive';
                row.cells[2].className = priceColorClass;
                row.cells[3].className = priceColorClass;
                row.cells[4].className = priceColorClass;

                priceCell.classList.add('twinkle');
                setTimeout(() => {
                    priceCell.classList.remove('twinkle');
                }, 500);
            }
        });
    })
});
