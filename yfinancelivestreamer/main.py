from src import YahooFinanceStreamer
import asyncio
import sys


if __name__ == '__main__':
    streamer = YahooFinanceStreamer(['QQQM', 'SPY', 'SCHD'])
    
    task = asyncio.get_event_loop()

    try:
        task.run_until_complete(streamer.get_stream())

    except KeyboardInterrupt:
        sys.exit()