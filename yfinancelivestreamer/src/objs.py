from entity import Entity

class PriceData(Entity):
    def __init__(self, proto_buf):
        self.id = proto_buf.id
        self.exchange = proto_buf.exchange
        self.quote_type: proto_buf.quoteType
        self.timestamp = proto_buf.time
        self.market_hours = proto_buf.market_hours
        self.last_price = proto_buf.price
        self.best_bid = proto_buf.bid
        self.best_ask = proto_buf.ask
        self.volume = proto_buf.dayVolume
        self.change = proto_buf.change
        self.change_percent = proto_buf.changePercent
        self.price_hint = proto_buf.priceHint
