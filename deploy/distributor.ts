import {DeployFunction} from 'hardhat-deploy/types';

const deployDistributor: DeployFunction = async function ({getNamedAccounts, deployments, network}) {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  await deploy("OrangeDistributor", {
    from: deployer,
    contract: "OrangeDistributor",
    proxy: {
      execute: {
        init: {
          methodName: "initialize",
          args: ["0xFdf1B2c4E291b17f8E998e89cF28985fAF3cE6A1"],
        },
      },
      proxyContract: "OpenZeppelinTransparentProxy",
    },
    log: true,
    autoMine: true,
  });
};

module.exports = deployDistributor
module.exports.tags = ['OrangeDistributor'];