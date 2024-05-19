import requests
import json
from datetime import datetime, timedelta
from collections import ChainMap


class KRXDataParser(object):
    def __init__(self):
        self.__krx_uri = 'http://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd'
        self.__index_ids = ['02', '03']
        self.__headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
                   'Content-Type': 'application/x-www-form-urlencoded'}
        
        try:
            with open('./index_info.json', 'r',  encoding='UTF-8-sig') as file:
                self.__index_info = json.load(file)

        
        except FileNotFoundError:
            self.__save_index_info()
            with open('./index_info.json', 'r', encoding='UTF-8-sig') as file:
                self.__index_info = json.load(file)
 
    @staticmethod
    def __get_today():
        today = datetime.today()
        weekday = today.weekday()

        if weekday == 5:  
            next_friday = today - timedelta(days=1)

        elif weekday == 6:
            next_friday = today - timedelta(days=2)

        else:
            next_friday = today

        return next_friday.strftime("%Y%m%d")       
    
    def __get_index_info(self, index_id):
        params = {'bld': 'dbms/MDC/STAT/standard/MDCSTAT00401', 'idxIndMidclssCd': index_id}
        resp = requests.post(self.__krx_uri, headers=self.__headers, params=params).json()

        return {idx_info['IDX_NM']: {'TP_CD': idx_info['IND_TP_CD'],  'IDX_CD': idx_info['IDX_IND_CD']} for idx_info in resp['output']}
    
    def __save_index_info(self):
        index_infos = dict(ChainMap(*[self.__get_index_info(index_id) for index_id in self.__index_ids]))

        with open('./index_info.json', 'w', encoding='UTF-8-sig') as file:
            file.write(json.dumps(index_infos, indent=4, ensure_ascii=False))

    def __get_index_const(self, index_name: str):
        params = {'bld': 'dbms/MDC/STAT/standard/MDCSTAT00601', 
                  'locale': 'ko_KR', 
                  'indIdx': self.__index_info[index_name]['TP_CD'],
                  'indIdx2': self.__index_info[index_name]['IDX_CD'],
                  'trdDd': self.__get_today()}
        
        resp = requests.post(self.__krx_uri, headers=self.__headers, params=params).json()

        if self.__index_info[index_name]['TP_CD'] == "1":
            return {ticker_info['ISU_ABBRV']: '{}.KS'.format(ticker_info['ISU_SRT_CD']) for ticker_info in resp['output']}
        
        else:
            return {ticker_info['ISU_ABBRV']: '{}.KQ'.format(ticker_info['ISU_SRT_CD']) for ticker_info in resp['output']}
    
    def save_index_const(self, index_names: list):
        consts = dict(ChainMap(*[self.__get_index_const(index_name) for index_name in index_names]))

        with open('./index_consts.json', 'w', encoding='UTF-8-sig') as file:
            file.write(json.dumps(consts, indent=4, ensure_ascii=False))


if __name__ == '__main__':
    parser = KRXDataParser()
    parser.save_index_const(['코스피 200', '코스닥 150'])
