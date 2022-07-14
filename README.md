# viv-contracts

[![Docs](https://img.shields.io/badge/docs-%F0%9F%93%84-blue)](https://docs.viv.com/contracts)
[![NPM Package](https://img.shields.io/npm/v/@openzeppelin/contracts.svg)](https://www.npmjs.org/package/@openzeppelin/contracts)
[![Tests](https://github.com/Uniswap/uniswap-v3-periphery/workflows/Tests/badge.svg)](https://github.com/Uniswap/uniswap-v3-periphery/actions?query=workflow%3ATests)
[![Lint](https://github.com/Uniswap/uniswap-v3-periphery/workflows/Lint/badge.svg)](https://github.com/Uniswap/uniswap-v3-periphery/actions?query=workflow%3ALint)

**Secured transactions are based on Smart contracts** Supporting multiple public chains and covering dozens of transaction scenarios, leading digital currency trading platforms through smart contracts.

- wallets
    - multi-signature wallet

- transactions
    - one-time transaction

### Local deployment

In order to deploy this code to a local testnet, you should install the npm package @viv/contracts and import bytecode imported from artifacts located at @viv/contracts/artifacts/contracts/*.json. 

For example:
```
    import {
        abi as VIV_NORMAL_ABI,
        bytecode as VIV_NORMAL_BYTECODE,
    } from '@viv/contracts/artifacts/contracts/trades/VivNormal.sol/VivNormal.json'
```
This will ensure that you are testing against the same bytecode that is deployed to mainnet and public testnets, and all viv code will correctly interoperate with your local deployment.

### Using solidity interfaces

```
import '@viv/contracts/trades/VivNormal.sol';

contract MyContract {
  VivNormal trans;

  function doSomethingWithNormal() {
    // trans.purchase;
  }
}
```