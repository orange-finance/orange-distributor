import {DeployFunction} from 'hardhat-deploy/types';

const deployDistributor: DeployFunction = async function ({getNamedAccounts, deployments, network}) {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  const arbitrumGaugeController = "0x82C13fCab02A168F06E12373F9e5D2C2Bd47e399"
  const arbitrumVaults = [
    "0x9338a4c3De7082E27802DCB6AC5A4502C93D1808",
    "0xa3899444a955Fb1DdDbd7Aea385771DB0a67fB12",
    "0x8b20087Bb0580bCB827d3ebDF06485aF86ea16cB",
  ]
  const arbitrumGauges = [
    "0x6B8E05cA2A6bd2E8b208B98F7b136E45Da5DAb63",
    "0xe68161C93A241012ABcfcE8e3AB74Ad55a96b98f",
    "0x78F874b79C144139125a253fc8130d35BbB66825"
  ]

  await deploy("OrangeDistributor", {
    from: deployer,
    contract: "OrangeDistributor",
    proxy: {
      execute: {
        init: {
          methodName: "initialize",
          args: [
            arbitrumGaugeController,
            "0x2eD0837D9f2fBB927011463FaD0736F86Ea6bF25",
            "0xd31583735e47206e9af728EF4f44f62B20db4b27",
            arbitrumVaults,
            arbitrumGauges
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