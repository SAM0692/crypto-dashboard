import { Test, TestingModule } from "@nestjs/testing";
import { FinnhubService } from "../../finnhub/finnhub.service";
import { RatesGateway } from "../../rates/rates.gateway";
import WebSocket from "ws";
import { DefaultApi } from "finnhub-ts";

const mockWs = {
    on: jest.fn(),
    close: jest.fn(),
    send: jest.fn(),
};

jest.mock('ws', () => jest.fn().mockImplementation(() => mockWs));

jest.mock('finnhub-ts', () => ({
  DefaultApi: jest.fn().mockImplementation(() => ({
    forexRates: jest.fn().mockResolvedValue({
      quote: { c: 3000 }, // ETH price example
    }),
  })),
}));

const mockRatesGateway = {
    broadcastRates: jest.fn()
};

describe("FinnhubService", () => {
    let service: FinnhubService;

    beforeEach(async () => {
        jest.useFakeTimers();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                FinnhubService,
                { provide: RatesGateway, useValue: mockRatesGateway },
                { provide: DefaultApi, useValue: new DefaultApi() }
            ]
        }).compile();

        service = module.get<FinnhubService>(FinnhubService);
    });

    afterEach(() => {
        jest.clearAllTimers();
        jest.clearAllMocks();
    });

    it("Should create websocket and register event listeners on init", () => {
        service.onModuleInit();

        expect(WebSocket).toHaveBeenCalledTimes(1);
        expect(mockWs.on).toHaveBeenCalledWith("open", expect.any(Function));
        expect(mockWs.on).toHaveBeenCalledWith("message", expect.any(Function));
        expect(mockWs.on).toHaveBeenCalledWith("close", expect.any(Function));
    });

    it("should handle incoming messages an update hourlyRates", () => {
        const ethPrice = 3000;
        const btcPrice = 10000;
        const ehtBtcRate = ethPrice / btcPrice;

        service.onModuleInit();

        const messageHandler = mockWs.on.mock.calls.find(c => c[0] === "message")[1];

        const currentTime = Date.now();
        const mockMsg = JSON.stringify({
            data: [
                { p: 3000, t: currentTime, s: "BINANCE:ETHUSDT" },
                { p: 10000, t: currentTime, s: "BINANCE:BTCUSDT" }
            ],
            type: "trade"
        });

        messageHandler(mockMsg);

        expect(service["hourlyRates"]["ETH/USDT"]).toHaveLength(1);
        expect(service["hourlyRates"]["ETH/BTC"]).toHaveLength(1);
        expect(mockRatesGateway.broadcastRates).toHaveBeenCalledWith({
            ["ETH/USDT"]: {
                hourlyAverage: ethPrice,
                rates: [{ rate: ethPrice,  timestamp: currentTime}]
            },
             ["ETH/BTC"]: {
                hourlyAverage: ehtBtcRate,
                rates: [{ rate: ehtBtcRate,  timestamp: currentTime}]
            }
        })
    });

    it("should close websocket on destroy", () => {
        service.onModuleInit();
        service.onModuleDestroy();

        expect(mockWs.close).toHaveBeenCalledTimes(1);
    });
});