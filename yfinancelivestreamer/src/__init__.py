import websockets
import base64
import json

from .yfin_pb2 import yaticker
from typing import List
from objs import PriceData


class YahooFinanceStreamer(object):
    def __init__(self, sub_tickers: List[str]):
        self.__websocket_uri = 'wss://streamer.finance.yahoo.com/'
        self.__subscribes = sub_tickers
        self.__proto_buf = yaticker()
    
    def __make_subscribe_msg(self):
        sub_msg = {'subscribe': self.__subscribes}

        return json.dumps(sub_msg)
    
    def __process_msg(self, msg: str):
        message_bytes = base64.b64decode(msg)
        self.__proto_buf.ParseFromString(message_bytes)

        data = PriceData(self.__proto_buf)

        print(data)


    async def get_stream(self):
        async with websockets.connect(self.__websocket_uri) as yfinance_ws:
            await yfinance_ws.send(self.__make_subscribe_msg())

            while yfinance_ws.open:
                self.__process_msg(await yfinance_ws.recv())
                