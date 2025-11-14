export type RateData = { rate: number, timestamp: number }

type RateDetails = {
    hourlyAverage: number | undefined;
    rates: Array<RateData>;
}

export type ExchangeRates = Record<string, RateDetails>;