'use strict';

const axios = require('axios');
const fs = require('fs');
const qs = require('qs');
const cheerio = require('cheerio');


class IndexCalculator{
    constructor() {
        this.krxUri = 'http://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd';
        this.fnguideUri = 'https://comp.fnguide.com/SVO2/ASP/SVD_Main.asp?pGB=1&gicode=A';
        this.indexIds = ['01', '02', '03', '04']

        try{
            this.indexInfo = JSON.parse(fs.readFileSync('./indexInfo.json', 'utf8'));
        }

        catch(error) {
            this.saveIndexInfo()
            this.indexInfo = JSON.parse(fs.readFileSync('./indexInfo.json', 'utf8'));
        }
    }

    getTodayDate() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
      
        return `${year}${month}${day}`;
      }

    async getIndexConst(indexName) {
        try{
            const msg = {
                bld: 'dbms/MDC/STAT/standard/MDCSTAT00601',
                locale: 'ko_KR',
                indIdx: this.indexInfo[indexName].TP_CD,
                indIdx2: this.indexInfo[indexName].IDX_CD,
                trdDd: this.getTodayDate()
            };

            try {
                const response =  await axios.post(this.krxUri, qs.stringify(msg), {
                    headers: {
                      'Content-Type': 'application/x-www-form-urlencoded'
                    }
                  });
                
                const indexConsts = response.data.output;
                const result = indexConsts.reduce((acc, indexConsts) => {
                    acc[indexConsts.ISU_SRT_CD] = {Name: indexConsts.ISU_ABBRV, Price: parseFloat(indexConsts.TDD_CLSPRC.replaceAll(',', '')), TotalShares: NaN, FloatShares: NaN, FloatRatio: NaN};
                    
                    return acc;
    
                }, {});

                return result;
              }
    
              catch (error) {
                throw error;
              }
        }
        
        catch(error) {
            console.log(error);
        }
    }

    async getSingleStockInfo(ticker) {
        const response = await axios.get(`${this.fnguideUri}${ticker}`);
        const $ = cheerio.load(response.data);
        
        const totalSharesStr = $('#svdMainGrid1 > table > tbody > tr:nth-child(7) > td:nth-child(2)').text().split('/')[0];
        const floatSharesStr = $('#svdMainGrid1 > table > tbody > tr:nth-child(7) > td.cle.r').text().split('/')[0];

        const totalShares = parseInt(totalSharesStr.replaceAll(',', ''));
        const floatShares = parseInt(floatSharesStr.replaceAll(',', ''));

        return [totalShares, floatShares, Math.round(100* floatShares / totalShares) / 100];
    }

    async makeIndexInfoFile(indexName) {
        const indexConst = await this.getIndexConst(indexName);

        for (const [ticker, info] of Object.entries(indexConst)){
            let stockInfo = await this.getSingleStockInfo(ticker);
            info.TotalShares = stockInfo[0];
            info.FloatShares = stockInfo[1];
            info.FloatRatio = stockInfo[2];
        }

        let csvContent = "Ticker,Name,Price,TotalShares,FloatShares,FloatRatio\n";

        Object.entries(indexConst).forEach(([ticker, info]) => {
            const row = `A${ticker},${info.Name},${info.Price},${info.TotalShares},${info.FloatShares},${info.FloatRatio}`;
            csvContent += row + "\n";
          });
          
        fs.writeFile(`${indexName}_${this.getTodayDate()}.csv`,  '\uFEFF' + csvContent, (err) => {
            if (err) {
              console.error('Error writing to CSV file', err);
            } else {
              console.log('CSV file has been saved.');
            }
        });
    }


     async getIndexInfo(index_id) {
        const msg = {
            bld: 'dbms/MDC/STAT/standard/MDCSTAT00401',
            idxIndMidclssCd: index_id
          };

          try{
            const response =  await axios.post(this.krxUri, qs.stringify(msg), {
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded'
                }
              });
            
            const indexInfos =  response.data.output;
            const result = indexInfos.reduce((acc, indexInfo) => {
                acc[indexInfo.IDX_NM] = {TP_CD: indexInfo.IND_TP_CD, IDX_CD: indexInfo.IDX_IND_CD};
                
                return acc;

            }, {});

            return result;
          }

          catch (error){
            throw error;
          }
    }

    async saveIndexInfo() {
        const promises = this.indexIds.map((element) => {
            return this.getIndexInfo(element);
        });
    
        try {
            const data = await Promise.all(promises);
            const indexInfo = Object.assign({}, ...data);

            fs.writeFileSync('./indexInfo.json', JSON.stringify(indexInfo, null, 2));

        } catch (error) {
            console.error(error);
        }
    }
}

module.exports = IndexCalculator;