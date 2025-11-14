export type TradeData = {
    s: string; // symbol
    p: number; // price
    t: number; // epoch ms timestamp
}

export type FinnhubTradeMsg = {
    type: string;
    data?: Array<TradeData>;
};

export type ExchangeRateDetails = {
    currencyPair: string, 
    rate: number, 
    timestamp: number
}