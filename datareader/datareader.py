import aiohttp
import asyncio
import logging
import pandas as pd

class KlineDataDownloader(object):
    KOREA_STOCK_VALID_INTERVAL = ['minute', 'minute3', 'minute5', 'minute10', 'minute30', 'minute60', 'day', 'week', 'month']
    GLOBAL_FINANCE_DATA_VALID_INTERVAL = ['1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d', '5d', '1wk', '1mo', '3mo']
    CRYPTO_VALID_INTERVAL = ['1s', '1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M']

    def __init__(self):
        self.__binance_spot_uri = 'https://api.binance.com/api/v3/klines'
        self.__binance_futures_uri = 'https://fapi.binance.com/fapi/v1/klines'
        self.__naver_finance_uri = 'https://api.stock.naver.com/chart/domestic/item/'
        self.__yahoo_finance_uri = 'https://query1.finance.yahoo.com/v8/finance/chart/'
        self.__headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
        }
        self.__crypto_rate_count = 0
    
    async def _fetch_data_crypto(self, session, url, params):
        async with session.get(url, params=params) as response:
            self.__crypto_rate_count = float(response.headers.get('X-MBX-USED-WEIGHT-1M'))
            return await response.json()
    
    async def _fetch_data_tradfi(self, session, url, params):
        async with session.get(url, params=params, headers=self.__headers) as response:
            return await response.json()
    
    async def _get_korea_stock_data(self, session, ticker, interval, start, end, file_path):
        '''
        Datetime Format: YYYYMMDDHHMM
        '''
        url = f'{self.__naver_finance_uri}{ticker}/{interval}'

        resp = await self._fetch_data_tradfi(session, url, params={'startDateTime': start, 'endDateTime': end})

        if 'code' not in resp:
            df = pd.DataFrame(resp)
            df.set_index('localDateTime', inplace=True)
            df.index = pd.to_datetime(df.index, format='%Y%m%d%H%M%S')
            df.sort_index(inplace=True)
            df.ffill(inplace=True)
            df.to_csv(file_path)
        
        else:
            logging.error(f'Error on fetching: Code {resp.code} Msg {resp.message}')
    
    async def _get_global_finance_data(self, session, ticker, interval, data_range, file_path):
        '''
        Datetime Format: YYYYMMDDHHMM
        '''
        url = f'{self.__yahoo_finance_uri}{ticker}'

        resp  = await self._fetch_data_tradfi(session, url, params={'interval': interval, 'range': data_range})

        if 'error' not in resp['chart'].keys():
            try:
                ohlcv = resp['chart']['result'][0]['indicators']['quote'][0]
                adj_close = resp['chart']['result'][0]['indicators']['adjclose'][0]['adjclose']
                
                data = {
                            'timestamp': resp['chart']['result'][1]['timestamp'],
                            'open': ohlcv['open'],
                            'high': ohlcv['high'],
                            'low': ohlcv['low'],
                            'close': ohlcv['close'],
                            'volume': ohlcv['volume'],
                            'adj_close': adj_close
                        }
            
            except KeyError:
                ohlcv = resp['chart']['result'][0]['indicators']['quote'][0]
                
                data = {
                            'timestamp': resp['chart']['result'][0]['timestamp'],
                            'open': ohlcv['open'],
                            'high': ohlcv['high'],
                            'low': ohlcv['low'],
                            'close': ohlcv['close'],
                            'volume': ohlcv['volume']
                        }
            
            df = pd.DataFrame(data)
            df.set_index('timestamp', inplace=True)
            df.index = pd.to_datetime(df.index, unit='s')
            df.sort_index(inplace=True)
            df.ffill(inplace=True)
            df.to_csv(file_path)
        
        else:
            logging.error('Fetcherror: {}'.format(resp['chart']['error']))

    async def _get_binance_futures_data(self, session, ticker, interval ,data_range, file_path):
        candle_datas = []
        is_first_req = True
        last_candle_time = 0
    
        while data_range > 0:
            if self.__crypto_rate_count >= 1500:
                await asyncio.sleep(60)
                self.__crypto_rate_count = 0

            if is_first_req:
                params = {"symbol": f"{ticker}USDT", "interval": interval, "limit": 499}
                resp = await self._fetch_data_crypto(session, self.__binance_futures_uri, params)
                last_candle_time = resp[0][0]
                candle_datas.append(resp)
                is_first_req = False

            else:
                params = {"symbol": f"{ticker}USDT", "interval": interval, "endTime": last_candle_time, "limit": 499}
                resp = await self._fetch_data_crypto(session, self.__binance_futures_uri, params)
                last_candle_time = resp[0][0]
                candle_datas.append(resp)
            
            data_range -= 499
    
        df = pd.DataFrame([candle_datum for candle_data in candle_datas for candle_datum in candle_data])[[0,1,2,3,4,5,9]]
        df.columns = ['time', 'open', 'high', 'low', 'close', 'volume', 'takerBuyBase']
        df['open'] = df['open'].astype(float)
        df['high'] = df['high'].astype(float)
        df['low'] = df['low'].astype(float)
        df['close'] = df['close'].astype(float)
        df['volume'] = df['volume'].astype(float)
        df['takerBuyBase'] = df['takerBuyBase'].astype(float)
        df.drop_duplicates(inplace=True, subset=['time'])
        df.set_index('time', inplace=True)
        df.sort_index(inplace=True)
        df.to_csv(file_path)
    
    async def _get_binance_spot_data(self, session, ticker, interval ,data_range, file_path):
        candle_datas = []
        is_first_req = True
        last_candle_time = 0
    
        while data_range > 0:
            if self.__crypto_rate_count >= 1500:
                await asyncio.sleep(60)
                self.__crypto_rate_count = 0

            if is_first_req:
                params = {"symbol": f"{ticker}USDT", "interval": interval}
                resp = await self._fetch_data_crypto(session, self.__binance_spot_uri, params)
                try:
                    last_candle_time = resp[0][0]
                    candle_datas.append(resp)
                    is_first_req = False

                except KeyError:
                    pass

            else:
                params = {"symbol": f"{ticker}USDT", "interval": interval, "endTime": last_candle_time}
                resp = await self._fetch_data_crypto(session, self.__binance_spot_uri, params)
                last_candle_time = resp[0][0]
                candle_datas.append(resp)
            
            data_range -= 500
    
        df = pd.DataFrame([candle_datum for candle_data in candle_datas for candle_datum in candle_data])[[0,1,2,3,4,5,9]]
        df.columns = ['time', 'open', 'high', 'low', 'close', 'volume', 'takerBuyBase']
        df['open'] = df['open'].astype(float)
        df['high'] = df['high'].astype(float)
        df['low'] = df['low'].astype(float)
        df['close'] = df['close'].astype(float)
        df['volume'] = df['volume'].astype(float)
        df['takerBuyBase'] = df['takerBuyBase'].astype(float)
        df.drop_duplicates(inplace=True, subset=['time'])
        df.set_index('time', inplace=True)
        df.sort_index(inplace=True)
        df.to_csv(file_path)
    
    async def get_multiple_korea_stock_data(self, tickers, interval, start, end):
        if interval not in KlineDataDownloader.KOREA_STOCK_VALID_INTERVAL:
            raise ValueError(f'Invalid interval, Valid interval is {KlineDataDownloader.KOREA_STOCK_VALID_INTERVAL}')

        async with aiohttp.ClientSession() as session:
            tasks = [self._get_korea_stock_data(session, ticker, interval, start, end, f'./{ticker}.csv') for ticker in tickers]
            await asyncio.gather(*tasks)
    
    async def get_multiple_global_finance_data(self, tickers,  interval, data_range):
        if interval not in KlineDataDownloader.GLOBAL_FINANCE_DATA_VALID_INTERVAL:
            raise ValueError(f'Invalid interval, Valid interval is {KlineDataDownloader.GLOBAL_FINANCE_DATA_VALID_INTERVAL}')
        
        async with aiohttp.ClientSession() as session:
            tasks = [self._get_global_finance_data(session, ticker, interval, data_range, f'./{ticker}.csv') for ticker in tickers]
            await asyncio.gather(*tasks)

    async def get_multiple_binance_spot_data(self, tickers, interval, data_range):
        if interval not in KlineDataDownloader.CRYPTO_VALID_INTERVAL:
            raise ValueError(f'Invalid interval, Valid interval is {KlineDataDownloader.CRYPTO_VALID_INTERVAL}')

        async with aiohttp.ClientSession() as session:
            tasks = [self._get_binance_spot_data(session, ticker, interval, data_range, f'./{ticker}.csv') for ticker in tickers]
            await asyncio.gather(*tasks)   

    async def get_multiple_binance_futures_data(self, tickers, interval, data_range):
        if interval not in KlineDataDownloader.CRYPTO_VALID_INTERVAL:
            raise ValueError(f'Invalid interval, Valid interval is {KlineDataDownloader.CRYPTO_VALID_INTERVAL}')
        
        async with aiohttp.ClientSession() as session:
            tasks = [self._get_binance_futures_data(session, ticker, interval, data_range, f'./{ticker}.csv') for ticker in tickers]
            await asyncio.gather(*tasks)


if __name__ == '__main__':
    parser = KlineDataDownloader()

    asyncio.run(parser.get_multiple_global_finance_data(['NVDA', 'AAPL'], '1m', '60d'))
