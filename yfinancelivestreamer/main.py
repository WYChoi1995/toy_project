from src import YahooFinanceStreamer
import asyncio
import sys

def callback_func(data):
    # Write a process func here!
    print(data)

if __name__ == '__main__':
    streamer = YahooFinanceStreamer(['NVDA', 'AAPL', 'TSLA', 'MSFT', 'GOOG'])
    
    task = asyncio.get_event_loop()

    try:
        task.run_until_complete(streamer.get_stream(callback=callback_func))

    except KeyboardInterrupt:
        sys.exit()
