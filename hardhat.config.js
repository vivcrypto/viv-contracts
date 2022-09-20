/// ENVVAR
// - CI:                output gas report to file instead of stdout
// - COVERAGE:          enable coverage report
// - ENABLE_GAS_REPORT: enable gas report
// - COMPILE_MODE:      production modes enables optimizations (default: development)
// - COMPILE_VERSION:   compiler version (default: 0.8.9)
// - COINMARKETCAP:     coinmarkercat api key for USD value in gas report

const fs = require('fs');
const path = require('path');
const argv = require('yargs/yargs')()
  .env('')
  .options({
    ci: {
      type: 'boolean',
      default: false,
    },
    coverage: {
      type: 'boolean',
      default: false,
    },
    gas: {
      alias: 'enableGasReport',
      type: 'boolean',
      default: false,
    },
    mode: {
      alias: 'compileMode',
      type: 'string',
      choices: [ 'production', 'development' ],
      default: 'development',
    },
    compiler: {
      alias: 'compileVersion',
      type: 'string',
      default: '0.8.4',
    },
    coinmarketcap: {
      alias: 'coinmarketcapApiKey',
      type: 'string',
    },
  })
  .argv;

require('@nomiclabs/hardhat-truffle5');
require('@nomiclabs/hardhat-ethers');
require("@nomiclabs/hardhat-etherscan");
require('hardhat-contract-sizer');

if (argv.enableGasReport) {
  require('hardhat-gas-reporter');
}

for (const f of fs.readdirSync(path.join(__dirname, 'hardhat'))) {
  require(path.join(__dirname, 'hardhat', f));
}

const withOptimizations = argv.enableGasReport || argv.compileMode === 'production';
const ETHERSCAN_API_KEY="KEY";
const ALCHEMY_API_KEY = "KEY";
const GOERLI_PRIVATE_KEY = "YOUR GOERLI PRIVATE KEY";

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: argv.compiler,
    settings: {
      optimizer: {
        enabled: true,
        runs: 1,
      },
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
  networks: {
    hardhat: {
      blockGasLimit: 10000000,
      allowUnlimitedContractSize: !withOptimizations,
      accounts: [
        {
          privateKey: '0xf835940b92310c14ffff0b30afb32b49a6cf6dc3dc7c083f9d0c950a10c4f057',
          balance: '100000000000000000000',
        },
        {
          privateKey: '0xbe4cf486849abc347e947fd76f94f7402a4342b209b9680b02335b7f97bd4e19',
          balance: '100000000000000000000',
        },
        {
          privateKey: '0xb32f0ec38fc01c0dc9de03e08249ba52094e2194599c0346184a3fe6d4519112',
          balance: '100000000000000000000',
        },
        {
          privateKey: '0x25eac5d15ebbe0c980db0ec0806abfa8022901b0b12a0523d438eb0347cd76ef',
          balance: '100000000000000000000',
        },
        {
          privateKey: '0x803f890f213d454efb4e556cd0ef055e1ba04be95b28ecb01ec67b1aa2f3119c',
          balance: '100000000000000000000',
        },
        {
          privateKey: '0x7a9d563525d7a956db628ec553c3010a776d2abb21a9f17e76b47530e0c2bade',
          balance: '100000000000000000000',
        },
        {
          privateKey: '0x016152d79cb9a74467247274969f07aa2e5fb863a7ba2707f8032d8fc6b3ae2b',
          balance: '100000000000000000000',
        },
        {
          privateKey: '0x68caa91c6f69750c1df52433ca6273d94662a4e49c9ead7d8b7dce3354782255',
          balance: '100000000000000000000',
        },
        {
          privateKey: '0x7d106a82e3ce13629f84716fa27c08298c41ea77849f33cc76cb0a18179ac025',
          balance: '100000000000000000000',
        },
        {
          privateKey: '0x3560ace1ff84bfc72552a4437cd732645f0c9441011a817578d666cde0ca819d',
          balance: '100000000000000000000',
        },

      ],
    },
    goerli: {
      url: `https://eth-goerli.alchemyapi.io/v2/${ALCHEMY_API_KEY}`,
      accounts: [GOERLI_PRIVATE_KEY],
    },
  },
  gasReporter: {
    currency: 'USD',
    outputFile: argv.ci ? 'gas-report.txt' : undefined,
    coinmarketcap: argv.coinmarketcap,
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
    disambiguatePaths: false,
  }
};

if (argv.coverage) {
  require('solidity-coverage');
  module.exports.networks.hardhat.initialBaseFeePerGas = 0;
}


