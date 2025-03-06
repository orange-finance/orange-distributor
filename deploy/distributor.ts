import {DeployFunction} from 'hardhat-deploy/types';

const deployDistributor: DeployFunction = async function ({getNamedAccounts, deployments, network, upgrades, ethers}) {
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
  const sykDepositor = "0x2eD0837D9f2fBB927011463FaD0736F86Ea6bF25"

  // const existingDeployment = await deployments.get("OrangeDistributor")
  // // check the new implementation is upgrade safe
  // await upgrades.validateUpgrade(
  //   existingDeployment.address,
  //   await ethers.getContractFactory('OrangeDistributor'),
  //   {
  //     kind: 'uups',
  //   },
  // )

  const deployment = await deploy("OrangeDistributor", {
    from: deployer,
    contract: "OrangeDistributor",
    proxy: {
      execute: {
        init: {
          methodName: "initialize",
          args: [
            "0xaE5d54837D88792Bed5bbc1a3665F7198176Bec6"
          ],
        },
      },
      proxyContract: "UUPS",
    },
    log: true,
    autoMine: true,
  });

  const distributor = await ethers.getContractAt("OrangeDistributor", deployment.address, await ethers.getSigner(deployer))

  // Note comment this if branch when testing, the new controller isn't deployed at the test block
  if (arbitrumGaugeController!=ethers.ZeroAddress && await distributor.controller()!=arbitrumGaugeController) {
    await distributor.setController(arbitrumGaugeController)
  }
  for (const [i, vault] of arbitrumVaults.entries()) {
    if (await distributor.gauges(vault)!=arbitrumGauges[i]) {
      await distributor.setGauge(vault, arbitrumGauges[i])
    }
  }
  if (sykDepositor!=ethers.ZeroAddress && await distributor.sykDepositor()!=sykDepositor) {
    await distributor.setSykDepositor(sykDepositor)
  }
  
};

module.exports = deployDistributor
module.exports.tags = ['OrangeDistributor'];