import aiohttp
import asyncio
import logging
import pandas as pd
from datetime import datetime

class KlineDataDownloader(object):
    KOREA_STOCK_VALID_INTERVAL = ['minute', 'minute3', 'minute5', 'minute10', 'minute30', 'minute60', 'day', 'week', 'month']
    GLOBAL_FINANCE_DATA_VALID_INTERVAL = ['1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d']
    CRYPTO_BINANCE_VALID_INTERVAL = ['1s', '1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M']
    CRYTPO_UPBIT_VALID_INTERVAL = ['1m', '3m', '5m', '10m', '15m', '30m', '60m', '240m', '1d', '1w', '1M']
    TIME_FACTORS = {'s': 1000, 'm': 60 * 1000, 'h': 3600 * 1000, 'd': 86400 * 1000, 'w': 604800 * 1000, 'M': 2592000 * 1000}
    GLOBAL_CANDLE_LIMITS = {'m': 7 * 24 * 60 * 60, 'h': 30 * 24 * 60 * 60, 'd': 365 * 24 * 60 * 60}
    AVAILABLE_DOWNLOAD_TYPE = ['KOREA_STOCK', 'GLOBAL_FINANCE', 'CRYPTO_SPOT_BINANCE', 'CRYPTO_FUTURES_BINANCE', 'CRYPTO_SPOT_UPBIT']

    def __init__(self):
        self.__binance_spot_uri = 'https://api.binance.com/api/v3/klines'
        self.__binance_futures_uri = 'https://fapi.binance.com/fapi/v1/klines'
        self.__naver_finance_uri = 'https://api.stock.naver.com/chart/domestic/item/'
        self.__yahoo_finance_uri = 'https://query1.finance.yahoo.com/v8/finance/chart/'
        self.__headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
        }
        self.__crypto_rate_count = 0
    
    @staticmethod
    def __convert_interval_to_ms(interval: str):
        return int(interval[:-1]) * KlineDataDownloader.TIME_FACTORS[interval[-1]]
    
    @staticmethod
    def __convert_interval_to_sec(interval: str):
        return int(interval[:-1]) * KlineDataDownloader.GLOBAL_CANDLE_LIMITS[interval[-1]]

    @staticmethod
    def __convert_datetime_to_ts(date: int, is_milli: bool = False):
        datetime_obj = datetime.strptime(str(date), '%Y%m%d%H%M')

        if is_milli:
            return 1000 * int(datetime_obj.timestamp())
        
        else:
            return int(datetime_obj.timestamp())
        
    @staticmethod
    def __convert_ts_to_datetime(date: int, is_milli: bool = False):
        datetime_obj = datetime.strptime(str(date), '%Y%m%d%H%M')

        if is_milli:
            return 1000 * int(datetime_obj.timestamp())
        
        else:
            return int(datetime_obj.timestamp())
    
    @staticmethod
    def __convert_datetime_to_iso8061(date: int):
        str_date = str(date)
        return f'{str_date[:4]}-{str_date[4:6]}-{str_date[6:8]}T{str_date[8:10]}:{str_date[10:12]}:{str_date[12:14]}Z'
    
    async def _fetch_data_crypto(self, session, url, params):
        async with session.get(url, params=params) as response:
            self.__crypto_rate_count = float(response.headers.get('X-MBX-USED-WEIGHT-1M'))
            return await response.json()
    
    async def __fetch_data_tradfi(self, session, url, params):
        async with session.get(url, params=params, headers=self.__headers) as response:
            return await response.json()
    
    async def __get_korea_stock_data(self, session, ticker, interval, start, end, file_path):
        url = f'{self.__naver_finance_uri}{ticker}/{interval}'

        resp = await self.__fetch_data_tradfi(session, url, params={'startDateTime': start, 'endDateTime': end})

        if 'code' not in resp:
            df = pd.DataFrame(resp)
            df.drop_duplicates(inplace=True, subset=['localDateTime'])
            df.set_index('localDateTime', inplace=True)
            df.index = pd.to_datetime(df.index, format='%Y%m%d%H%M%S')
            df.sort_index(inplace=True)
            df.ffill(inplace=True)
            df.to_csv(file_path)
        
        else:
            logging.error(f'Error on fetching: Code {resp.code} Msg {resp.message}')
    
    async def __get_global_finance_data(self, session, ticker, interval, start, end, file_path):
        url = f'{self.__yahoo_finance_uri}{ticker}'
        datas = []
        interval_convert = self.__convert_interval_to_sec(interval)
        end_time = self.__convert_datetime_to_ts(end)
        last_end_time = self.__convert_datetime_to_ts(start)
        
        while end_time > last_end_time:
            start_time = end_time - interval_convert
            resp  = await self.__fetch_data_tradfi(session, url, params={'interval': interval, 'period1': start_time, 'period2': end_time})

            if resp['chart']['result'] is not None:
                try:
                    ohlcv = resp['chart']['result'][0]['indicators']['quote'][0]
                    adj_close = resp['chart']['result'][0]['indicators']['adjclose'][0]['adjclose']
                    
                    data = {
                                'timestamp': resp['chart']['result'][0]['timestamp'],
                                'open': ohlcv['open'],
                                'high': ohlcv['high'],
                                'low': ohlcv['low'],
                                'close': ohlcv['close'],
                                'volume': ohlcv['volume'],
                                'adj_close': adj_close
                            }
                    
                    datas.append(data)

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
                    
                    datas.append(data)

                end_time = start_time
            
            else:
                logging.error('Fetcherror: {}'.format(resp['chart']['error']))
                break
        
        df = pd.concat([pd.DataFrame(data) for data in datas], axis=0)
        df.drop_duplicates(inplace=True, subset=['timestamp'])
        df.set_index('timestamp', inplace=True)
        df.index = pd.to_datetime(df.index, unit='s')
        df.sort_index(inplace=True)
        df.ffill(inplace=True)
        df.to_csv(file_path)

    async def __get_binance_futures_data(self, session, ticker, interval, start, end, file_path):
        candle_datas = []
        interval_convert = self.__convert_interval_to_ms(interval)
        start_time = self.__convert_datetime_to_ts(start, True)
        end_time = self.__convert_datetime_to_ts(end, True)
        temp_start = end_time - 499 * interval_convert

        while temp_start > start_time:
            if self.__crypto_rate_count >= 1500:
                await asyncio.sleep(60)
                self.__crypto_rate_count = 0

            params = {'symbol': ticker, 'interval': interval, 'startTime': temp_start, 'endTime': end_time}
            resp = await self._fetch_data_crypto(session, self.__binance_futures_uri, params)

            if 'code' not in resp:
                candle_datas.append(resp)

            else:
                logging.error(f'{resp}')
                break

            end_time = temp_start
            temp_start = end_time - 499 * interval_convert
    
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
    
    async def __get_binance_spot_data(self, session, ticker, interval ,start, end, file_path):
        candle_datas = []
        interval_convert = self.__convert_interval_to_ms(interval)
        start_time = self.__convert_datetime_to_ts(start, True)
        end_time = self.__convert_datetime_to_ts(end, True)
        temp_start = end_time - 500 * interval_convert

        while temp_start > start_time:
            if self.__crypto_rate_count >= 1500:
                await asyncio.sleep(60)
                self.__crypto_rate_count = 0

            params = {'symbol': ticker, 'interval': interval, 'startTime': temp_start, 'endTime': end_time}
            resp = await self._fetch_data_crypto(session, self.__binance_spot_uri, params)

            if 'code' not in resp:   
                candle_datas.append(resp)

            else:
                logging.error(f'{resp}')
                break
            
            end_time = temp_start
            temp_start = end_time - 500 * interval_convert

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

    async def __get_upbit_spot_data(self, session, ticker, interval, start, end, file_path):
        '''
        Datetime Format: YYYYMMDDHHMM
        '''
        candle_datas = []
        end_time = self.__convert_datetime_to_iso8061(end)
        

    async def __get_multiple_korea_stock_data(self, tickers, interval, start, end):
        '''
        Datetime Format: YYYYMMDDHHMM
        '''
        if interval not in KlineDataDownloader.KOREA_STOCK_VALID_INTERVAL:
            raise ValueError(f'Invalid interval, Valid interval is {KlineDataDownloader.KOREA_STOCK_VALID_INTERVAL}')

        async with aiohttp.ClientSession() as session:
            tasks = [self.__get_korea_stock_data(session, ticker, interval, start, end, f'./{ticker}.csv') for ticker in tickers]
            await asyncio.gather(*tasks)
    
    async def __get_multiple_global_finance_data(self, tickers,  interval, start, end):
        '''
        Datetime Format: YYYYMMDDHHMM
        '''
        if interval not in KlineDataDownloader.GLOBAL_FINANCE_DATA_VALID_INTERVAL:
            raise ValueError(f'Invalid interval, Valid interval is {KlineDataDownloader.GLOBAL_FINANCE_DATA_VALID_INTERVAL}')
        
        async with aiohttp.ClientSession() as session:
            tasks = [self.__get_global_finance_data(session, ticker, interval, start, end, f'./{ticker}.csv') for ticker in tickers]
            await asyncio.gather(*tasks)

    async def __get_multiple_binance_spot_data(self, tickers, interval, start, end):
        '''
        Datetime Format: YYYYMMDDHHMM
        '''
        if interval not in KlineDataDownloader.CRYPTO_BINANCE_VALID_INTERVAL:
            raise ValueError(f'Invalid interval, Valid interval is {KlineDataDownloader.CRYPTO_BINANCE_VALID_INTERVAL}')

        async with aiohttp.ClientSession() as session:
            tasks = [self.__get_binance_spot_data(session, ticker, interval, start, end, f'./{ticker}_S.csv') for ticker in tickers]
            await asyncio.gather(*tasks)   

    async def __get_multiple_binance_futures_data(self, tickers, interval, start, end):
        '''
        Datetime Format: YYYYMMDDHHMM
        '''
        if interval not in KlineDataDownloader.CRYPTO_BINANCE_VALID_INTERVAL:
            raise ValueError(f'Invalid interval, Valid interval is {KlineDataDownloader.CRYPTO_BINANCE_VALID_INTERVAL}')
        
        async with aiohttp.ClientSession() as session:
            tasks = [self.__get_binance_futures_data(session, ticker, interval, start, end, f'./{ticker}_F.csv') for ticker in tickers]
            await asyncio.gather(*tasks)
    
    def download_data(self, download_type, tickers, interval, start, end):
        if download_type not in KlineDataDownloader.AVAILABLE_DOWNLOAD_TYPE:
            raise ValueError(f'Invalid download type, Valid type is {KlineDataDownloader.AVAILABLE_DOWNLOAD_TYPE}')
        
        else:
            if download_type == 'KOREA_STOCK':
                asyncio.run(self.__get_multiple_korea_stock_data(tickers, interval, start, end))
            
            elif download_type == 'GLOBAL_FINANCE':
                asyncio.run(self.__get_multiple_global_finance_data(tickers, interval, start, end))
            
            elif download_type == 'CRYPTO_SPOT_BINANCE':
                asyncio.run(self.__get_multiple_binance_spot_data(tickers, interval, start, end))
            
            elif download_type == 'CRYPTO_FUTURES_BINANCE':
                asyncio.run(self.__get_multiple_binance_futures_data(tickers, interval, start, end))
