# Crypto Dashboard Backend

This is a backend project with the purpose of calculating and streaming various exchanges rates throught websockets.

## Description

This application feeds of Finnhub's [trades](https://finnhub.io/docs/api/websocket-trades) websocket endpoint in order to calculate the exchange rates of multiple crypto currencies with Ehtereum as the base currency (e.g. ETH/BTC). After calculating the rates it groups them by the corresponding currency pair and emits a message via websockets with this payload.

## Getting Started

### Dependencies

You must have npm and NodeJs installed in order to run this project. You can follow any of the guides listed [here](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) depenfing on your operating system.

### Installing

1. Get an API key from [finnhub.io](https://finnhub.io/), it requires you to sign in/sign up.
2. Clone this repository.
  ```sh
  git clone https://github.com/SAM0692/crypto-dashboard.git
  ```
3. Install npm packages
   ```sh
   npm install
   ```
 4. In the project's root directory, create a `.env` file an add your API key. You can also add a constant for the port you wish to run the application on (the default is 3000).
    ```sh
    FINNHUB_API_KEY=<PASTE_API_KEY>
    PORT=<PORT_NUMBER> (Optional)
    ```

### Running application

To start the application simply run the start command usin npm.
```sh
npm run start
```
