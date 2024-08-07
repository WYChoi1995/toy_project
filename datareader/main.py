from src.datareader import KlineDataDownloader


if __name__ == '__main__':
    parser = KlineDataDownloader()
    parser.download_data('CRYPTO_SPOT_BINANCE', ['BTCUSDT', 'ETHUSDT'], '1m', 202407200000, 202407270000)
