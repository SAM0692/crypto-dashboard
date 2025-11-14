import { Module } from '@nestjs/common';
import { FinnhubService } from './finnhub/finnhub.service';
import { RatesGateway } from './rates/rates.gateway';

@Module({
  providers: [FinnhubService, RatesGateway],
})
export class AppModule {}
