import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import '@nomicfoundation/hardhat-ethers';
import 'hardhat-deploy';
import 'hardhat-deploy-ethers';
import '@nomicfoundation/hardhat-chai-matchers';
import '@typechain/hardhat';
import 'solidity-coverage';
import '@openzeppelin/hardhat-upgrades'
import { ethers } from "ethers";
require("dotenv").config();

const signer = new ethers.Wallet(process.env.PRIVATE_KEY!);
console.log(signer.address)

const config: HardhatUserConfig = {
  solidity: "0.8.27",
  networks: {
    hardhat: {
      forking: {
        url: process.env.ARBITRUM_RPC!,
        blockNumber: 312295890
      },
    },
    localhost: {
      url: "http://127.0.0.1:8545/",
    },
    arbitrum: {
      url: process.env.ARBITRUM_RPC,
      accounts: [process.env.PRIVATE_KEY!],
      verify: {
        etherscan: {
          apiUrl: 'https://api.arbiscan.io',
          apiKey: process.env.ARBISCAN_KEY!
        }
      },
    },
    arbitrumSepolia: {
      url: 'https://sepolia-rollup.arbitrum.io/rpc',
      accounts: [process.env.PRIVATE_KEY!],
    },
  },
  etherscan: {
    apiKey: {
      arbitrumOne: process.env.ARBISCAN_KEY!,
      arbitrumSepolia: process.env.ARBISCAN_KEY!,
    },
    customChains: [
      {
        network: 'arbitrumSepolia',
        chainId: 421614,
        urls: {
          apiURL: 'https://api-sepolia.arbiscan.io/api',
          browserURL: 'https://sepolia.arbiscan.io',
        },
      },
    ],
  },
  mocha: {
    timeout: 1000000000000000
  },
  namedAccounts: {
    deployer: {
      default: 0,
      42161: signer.address
    },
  }
};

export default config;
