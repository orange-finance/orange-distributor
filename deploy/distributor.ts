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
          args: [
            "0xFdf1B2c4E291b17f8E998e89cF28985fAF3cE6A1",
            "0xd31583735e47206e9af728EF4f44f62B20db4b27",
            [
              "0x5f6D5a7e8eccA2A53C6322a96e9a48907A8284e0",
              "0x22dd31a495CafB229131A16C54a8e5b2f43C1162",
              "0xE32132282D181967960928b77236B3c472d5f396",
            ],
            [
              "0x4927a62feFE180f9E6307Ef5cb34f94FcAd09227",
              "0x97b1f6a13500de55B62b57B2D9e30Ca9E9bAB11B",
              "0x61e9B42f28cdF30173c591b2eB38023ed969d437"
            ]
          ],
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