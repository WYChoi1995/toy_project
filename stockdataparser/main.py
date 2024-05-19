import asyncio
from src.krxparser import KRXDataParser
from src.yahooparser import YahooDataParser
import json

if __name__ == '__main__':
    krx_parser = KRXDataParser()
    krx_parser.save_index_const(['코스피 200', '코스닥 150'])

    with open('./index_consts.json', 'r', encoding='UTF-8-sig') as file:
        consts = json.load(file)

    yahoo_parser = YahooDataParser()
    tickers = [ticker for ticker in consts.values()]

    asyncio.run(yahoo_parser.get_stock_datas(tickers, '1d', '10y'))
