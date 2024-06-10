document.addEventListener("DOMContentLoaded", function() {
    if (Notification.permission !== 'granted') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
            
            }

            else {
                alert('Permission for notifications was denied');
            }
        });
    }

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
                } else {
                    socket.emit('tradfiSubscribe', [ticker]);
                }
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
            } else {
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
        row.insertCell(5).innerHTML = '<input type="number" class="alert-price" />';
        row.insertCell(6).innerHTML = `
            <select class="alert-condition">
                <option value="above">Above</option>
                <option value="below">Below</option>
            </select>
        `;
        row.insertCell(7).innerHTML = '<input type="checkbox" class="activate-alert" />';
    }

    function removeTableRow(ticker) {
        const rows = priceTable.querySelectorAll('tr[data-ticker]');
        rows.forEach(row => {
            if (row.getAttribute('data-ticker') === ticker) {
                priceTable.deleteRow(row.rowIndex);
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

    function checkAlerts(ticker, price) {
        const row = priceTable.querySelector(`tr[data-ticker="${ticker}"]`);
        const alertPriceInput = row.querySelector('.alert-price');
        const alertConditionSelect = row.querySelector('.alert-condition');
        const activateAlertCheckbox = row.querySelector('.activate-alert');
    
        if (activateAlertCheckbox.checked) {
            const alertPrice = parseFloat(alertPriceInput.value);
            const alertCondition = alertConditionSelect.value;
    
            if (!isNaN(alertPrice)) {
                if (alertCondition === "above" && price > alertPrice) {
                    showNotification(`Price rise: ${ticker}`, `Price has reached the alert level of ${formatPrice(alertPrice)}`);
                    activateAlertCheckbox.checked = false;
                }

                else if (alertCondition === "below" && price < alertPrice) {
                    showNotification(`Price decline: ${ticker}`, `Price has reached the alert level of ${formatPrice(alertPrice)}`);
                    activateAlertCheckbox.checked = false;
                }
            }
        }
    }

    function showNotification(title, body) {
        if (Notification.permission === 'granted') {
            new Notification(title, { body: body, requireInteraction: true });

        } else {
            console.log('Notification permission not granted');
        }
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

                checkAlerts(data.id, parseFloat(data.price));
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

                checkAlerts(data.s, parseFloat(data.c));
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
                console.log(`Removing subscription for: ${ticker}`);
                subscriptionList.removeChild(listItems[i]);
                removeTableRow(ticker);
                logConsole(`Unsubscribed from ${ticker}`);
    
                if (ticker.endsWith("USDT")){
                    socket.emit('cryptoUnsubscribe', [ticker]);
                } else {
                    socket.emit('tradfiUnsubscribe', [ticker]);
                }
            });
        }
    }

    function updateTableRows() {
        const tickers = Array.from(subscriptionList.getElementsByTagName("li")).map(li => li.textContent);
        const rows = Array.from(priceTable.querySelectorAll('tr[data-ticker]'));
        rows.forEach(row => priceTable.deleteRow(row.rowIndex - 1));

        tickers.forEach(ticker => addTableRow(ticker));
    }

    initializeDragAndDrop();
});
