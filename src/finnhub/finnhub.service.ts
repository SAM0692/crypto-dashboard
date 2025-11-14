import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import WebSocket from 'ws';
import { RatesGateway } from '../rates/rates.gateway';
import * as dotenv from 'dotenv';
import { DefaultApi } from 'finnhub-ts';
import { ExchangeRateDetails, FinnhubTradeMsg, TradeData } from './finnhub.types';
import { ExchangeRates, RateData } from '../rates/rates.types';

dotenv.config();

const UPDATE_AFTER = 1000;

let lastEthTrade: TradeData | undefined;

@Injectable()
export class FinnhubService implements OnModuleInit, OnModuleDestroy {
    private readonly token = process.env.FINNHUB_API_KEY;
    private ws: WebSocket;
    private finnhubClient: DefaultApi;
    private hourlyRates: Record<string, RateData[]> = {};

    private readonly symbols = [
        'BINANCE:BTCUSDT',
        'BINANCE:ETHUSDT',
        'BINANCE:USDCUSDT',
    ];


    constructor(private readonly ratesGateway: RatesGateway) { }

    onModuleInit() {
        if (!this.token) {
            console.error('FINNHUB_API_KEY is not set. Please set FINNHUB_API_KEY in .env');
            return;
        }

        this.connect();
    }

    onModuleDestroy() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    private connect() {
        const url = `wss://ws.finnhub.io?token=${this.token}`;
        this.ws = new WebSocket(url);
        this.finnhubClient = new DefaultApi({
            apiKey: this.token,
            isJsonMime: (input) => {
                try {
                    JSON.parse(input)
                    return true
                } catch (error) { }
                return false
            }
        });

        this.ws.on('open', () => {
            console.log('Connected to Finnhub websocket');
            // Subscribe to symbols
            for (const sym of this.symbols) {
                const sub = JSON.stringify({ type: 'subscribe', symbol: sym });
                this.ws!.send(sub);
                console.log(`Subscribed to ${sym}`);

                this.ws!.send
            }
        });

        this.ws.on('message', async (raw) => {
            try {
                const msg: FinnhubTradeMsg = JSON.parse(raw.toString());
                const rates: Array<ExchangeRateDetails> = [];
                if (msg.type === 'trade' && msg.data) {
                    this.calculateExchangeRates(msg.data);
                } else {
                    console.log(`Finnhub msg: { type: ${msg.type}, data: ${msg.data || "no data"}}`);
                }
            } catch (err) {
                console.error('Failed to parse Finnhub message', err);
            }
        });

        this.ws.on('close', (code, reason) => {
            console.warn('Finnhub ws closed', code, reason?.toString());
            // try reconnect after short delay
            setTimeout(() => this.connect(), 3000);
        });

        this.ws.on('error', (err) => {
            console.error('Finnhub ws error', err);
            // ws will emit 'close' next; optionally close here
            try { this.ws?.terminate(); } catch { }
        });
    }

    private async calculateExchangeRates(tradeData: TradeData[]) {
        const rates: Array<ExchangeRateDetails> = [];
        lastEthTrade = tradeData.findLast(t => t.s.includes("ETH")) || await this.getLastEthSnapshot() || lastEthTrade;

        for (const trade of tradeData) {
            const symbol = trade.s.replace("BINANCE:", "").replace("USDT", "");

            const isEth = symbol === "ETH"
            const exchangeRate = isEth ? trade.p : lastEthTrade!.p / trade.p;
            rates.push({
                currencyPair: `ETH/${isEth ? "USDT" : symbol}`,
                rate: exchangeRate,
                timestamp: trade.t
            })
        }

        const ratesToBrodcast = this.groupByCurrencyPair(rates);

        for (const [currencyPair, currentRate] of Object.entries(ratesToBrodcast)) {
            currentRate.hourlyAverage = this.calculateHourlyAverage(currencyPair, currentRate.rates);
        }

        this.ratesGateway.broadcastRates(ratesToBrodcast);
    }

    private async getLastEthSnapshot() {
        try {
            const ethSymbol = "BINANCE:ETHUSDT";
            const currentTime = Date.now();
            if (lastEthTrade && lastEthTrade.t >= (currentTime - UPDATE_AFTER)) {
                return undefined;
            }
            
            const quote = await this.finnhubClient.quote(ethSymbol);
            return {
                p: quote.data.c,
                s: ethSymbol,
                t: currentTime
            } as TradeData;
        } catch (err) {
            console.error("Failed to fetch price for ETH: ", err);
        }
    }

    private groupByCurrencyPair(rateDetails: ExchangeRateDetails[]) {
        const groupedRates: ExchangeRates = {};

        for (const rateDetail of rateDetails) {
            if (!groupedRates[rateDetail.currencyPair]) {
                groupedRates[rateDetail.currencyPair] = { hourlyAverage: undefined, rates: [] };
            }

            groupedRates[rateDetail.currencyPair].rates.push({ rate: rateDetail.rate, timestamp: rateDetail.timestamp });
        }

        for (const key of Object.keys(groupedRates)) {
            groupedRates[key].rates = groupedRates[key].rates
                // Sort all rates by timestamp
                .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                // Keep only one rate update by timestamp
                .filter((r, index, arr) => index === 0 || r.timestamp !== arr[index - 1].timestamp)
        }

        return groupedRates;
    }

    private calculateHourlyAverage(currencyPair: string, rates: RateData[]) {
        let hourRatesToUpdate = this.hourlyRates[currencyPair];
        if (!hourRatesToUpdate || hourRatesToUpdate.length === 0) {
            hourRatesToUpdate = rates;
        } else {
            hourRatesToUpdate = [...hourRatesToUpdate, ...rates];
        }
        this.hourlyRates[currencyPair] = hourRatesToUpdate;

        const anHourAgo = Date.now() - (60 * 60 * 1000);
        const lastHourRates = hourRatesToUpdate
            .filter(r => r.timestamp >= anHourAgo);

        const ratesSum = hourRatesToUpdate
            .reduce((acc, e) => acc + e.rate, 0);

        return ratesSum / lastHourRates.length;
    }

}