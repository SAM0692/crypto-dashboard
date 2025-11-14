import { Test } from "@nestjs/testing";
import { RatesGateway } from "../../rates/rates.gateway";
import { ExchangeRates } from "../../rates/rates.types";

describe("RatesGateway", () => {
    let gateway: RatesGateway;
    let mockServer: any;

    beforeEach(async() => {
        const module = await Test.createTestingModule({
            providers: [RatesGateway]
        }).compile();

        gateway = module.get<RatesGateway>(RatesGateway);
        mockServer = {
            emit: jest.fn()
        } as any;

        gateway.server = mockServer;
    });

    it("Should emit rates updates correctly", () => {
        const mockedPayload = {
            "ETH/BTC": {
                hourlyAverage: 10521,
                rates: [{ rate: 0.034, timestamp: 1763059239976}]
            }
        } as ExchangeRates;

        gateway.broadcastRates(mockedPayload);

        expect(mockServer.emit).toHaveBeenCalledWith("rates", mockedPayload);
    });
});