# MyBit Options
[![CircleCI](https://circleci.com/gh/MyBitFoundation/MyBit-Options.tech.svg?style=shield)](https://circleci.com/gh/MyBitFoundation/MyBit-Options.tech) [![Coverage Status](https://coveralls.io/repos/github/MyBitFoundation/MyBit-Options.tech/badge.svg?branch=feature%2Fcoverage)](https://coveralls.io/github/MyBitFoundation/MyBit-Options.tech?branch=feature%2Fcoverage)

The Options Dapp allows users to create a simple [options contract](https://www.investopedia.com/terms/o/option.asp) allowing for a user to purchase the right to buy tokens at a particular date and price. 


## Setup

Install dependencies.

`yarn`

## Testing

Bootstrap [Ganache](https://truffleframework.com/ganache)

`yarn blockchain`

Run tests

`yarn test`

✏️ All contracts are written in [Solidity](https://solidity.readthedocs.io/en/v0.4.24/) version 0.4.24.

## Compiling

`yarn compile`

## Code Coverage

Download solidity-coverage locally

`npm install --save-dev solidity-coverage`

Run solidity-coverage

`./node_modules/.bin/solidity-coverage`

Coverage reports can be accessed at 'coverage/index.html'

## Documentation

```
cd docs/website
yarn build
```

To publish to GitHub Pages

```
cd docs/website
GIT_USER=<GIT_USER> \
  USE_SSH=true \
  yarn run publish-gh-pages
```

### ⚠️ Warning
This application is unstable and has not undergone any rigorous security audits. Use at your own risk.
