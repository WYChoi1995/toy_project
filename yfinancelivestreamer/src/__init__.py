import websockets
import asyncio
import base64
import json

from .yfin_pb2 import yaticker
from typing import List
from google.protobuf.json_format import MessageToDict

from websockets.exceptions import ConnectionClosedError, ConnectionClosedOK


class YahooFinanceStreamer(object):
    def __init__(self, sub_tickers: List[str]):
        self.__websocket_uri = 'wss://streamer.finance.yahoo.com/'
        self.__subscribes = sub_tickers
        self.__proto_buf = yaticker()
    
    def __make_subscribe_msg(self):
        sub_msg = {'subscribe': self.__subscribes}

        return json.dumps(sub_msg)
    
    def __process_msg(self, msg: str, callback):
        message_bytes = base64.b64decode(msg)
        self.__proto_buf.ParseFromString(message_bytes)

        callback(MessageToDict(self.__proto_buf))


    async def get_stream(self, callback):
        while True:
            try:
                async with websockets.connect(self.__websocket_uri) as yfinance_ws:
                    await yfinance_ws.send(self.__make_subscribe_msg())

                    while yfinance_ws.open:
                        self.__process_msg(await yfinance_ws.recv(), callback=callback)
            
            except (ConnectionClosedError, ConnectionClosedOK) as WebsocketError:
                await asyncio.sleep(1)
