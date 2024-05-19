import aiohttp
import asyncio
import json
from typing import List


class YahooDataParser(object):
    def __init__(self):
        self.__yahoo_uri = 'https://query1.finance.yahoo.com/v8/finance/chart/'
        self.__headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
                   'Content-Type': 'application/x-www-form-urlencoded'}
        self.__datas = {}
        
    
    async def __get_stock_data(self, ticker: str, interval: str, date_range: str):
        end_point = '{0}?interval={1}&range={2}'.format(ticker, interval, date_range)

        async with aiohttp.ClientSession() as client:
            async with client.get('{0}{1}'.format(self.__yahoo_uri, end_point), headers=self.__headers) as response:
                data = await response.json()
            
        ohlcv = data['chart']['result'][0]['indicators']['quote'][0]
        adj_close = data['chart']['result'][0]['indicators']['adjclose'][0]['adjclose']
        
        self.__datas[ticker] = {'timestamp': data['chart']['result'][0]['timestamp'],
                                'open': ohlcv['open'],
                                'high': ohlcv['high'],
                                'low': ohlcv['low'],
                                'close': ohlcv['close'],
                                'volume': ohlcv['volume'],
                                'adj_close': adj_close}
        
    async def get_stock_datas(self, tickers: List[str], interval: str, date_range: str):
        await asyncio.gather(*[self.__get_stock_data(ticker, interval=interval, date_range=date_range) for ticker in tickers])

        with open('./datas.json', 'w') as file:
            file.write(json.dumps(self.__datas, sort_keys=True))


if __name__ == '__main__':
    parser = YahooDataParser()
    tickers = ['005930.KS', '000660.KS']

    asyncio.run(parser.get_stock_datas(tickers, '1d', '10y'))
