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
                    socket.emit('tradfiSubscribe', [ticker]);
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
        listItem.setAttribute("draggable", true);
        listItem.addEventListener("dblclick", function() {
            subscriptionList.removeChild(listItem);
            removeTableRow(ticker);
            logConsole(`Unsubscribed from ${ticker}`);

            if (ticker.endsWith("USDT")){
                socket.emit('cryptoUnsubscribe', [ticker]);
            }

            else{
                socket.emit('tradfiUnsubscribe', [ticker]);
            }
        });

        listItem.addEventListener("dragstart", handleDragStart);
        listItem.addEventListener("dragover", handleDragOver);
        listItem.addEventListener("drop", handleDrop);
        listItem.addEventListener("dragend", handleDragEnd);
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

                const priceColorClass = data.p < 0 ? 'change-negative' : 'change-positive';
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

    let dragSrcEl = null;

    function handleDragStart(e) {
        dragSrcEl = this;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.outerHTML);
        this.classList.add('dragElem');
    }

    function handleDragOver(e) {
        if (e.preventDefault) {
            e.preventDefault();
        }
        e.dataTransfer.dropEffect = 'move';
        return false;
    }

    function handleDrop(e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        }
        if (dragSrcEl !== this) {
            dragSrcEl.outerHTML = this.outerHTML;
            this.outerHTML = e.dataTransfer.getData('text/html');

            initializeDragAndDrop();

            updateTableRows();
        }
        return false;
    }

    function handleDragEnd(e) {
        this.classList.remove('dragElem');
    }

    function initializeDragAndDrop() {
        const listItems = subscriptionList.getElementsByTagName("li");
        for (let i = 0; i < listItems.length; i++) {
            listItems[i].addEventListener("dragstart", handleDragStart);
            listItems[i].addEventListener("dragover", handleDragOver);
            listItems[i].addEventListener("drop", handleDrop);
            listItems[i].addEventListener("dragend", handleDragEnd);
            listItems[i].addEventListener("dblclick", function() {
                const ticker = listItems[i].textContent;
                console.log(`Removing subscription for: ${ticker}`); // Debug log
                subscriptionList.removeChild(listItems[i]);
                removeTableRow(ticker);
                logConsole(`Unsubscribed from ${ticker}`);
                socket.emit('unsubscribe', [ticker]);
            });
        }
    }

    function updateTableRows() {
        const tickers = Array.from(subscriptionList.getElementsByTagName("li")).map(li => li.textContent);
        const rows = Array.from(priceTable.querySelectorAll('tr[data-ticker]'));
        rows.forEach(row => priceTable.deleteRow(row.rowIndex - 1)); // Clear existing rows

        tickers.forEach(ticker => addTableRow(ticker)); // Re-add rows in the new order
    }

    initializeDragAndDrop();

});
