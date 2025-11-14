import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { ExchangeRates } from './rates.types';

@WebSocketGateway({ cors: {origin: '*' } })
@Injectable()
export class RatesGateway {
    @WebSocketServer()
    server: Server;

    broadcastRates(payload: ExchangeRates) {
        this.server.emit("rates", payload);
    }
}