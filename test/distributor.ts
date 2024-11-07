import { expect } from "chai";
import hre, { deployments, ethers, network } from "hardhat";
import { ERC20, IGauge, IGaugeController, OrangeDistributor } from "../typechain-types";
import { addTokenBalance } from "../utils/erc20";
import { createRootAndProofs } from "../utils/merkle";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Gauge", function () {
  const controllerAddress = "0xFdf1B2c4E291b17f8E998e89cF28985fAF3cE6A1"
  const vaultAddresses = [
    "0x5f6D5a7e8eccA2A53C6322a96e9a48907A8284e0",
    "0x22dd31a495CafB229131A16C54a8e5b2f43C1162",
    "0xE32132282D181967960928b77236B3c472d5f396",
  ]
  const gaugeAddresses = [
    // "0xc16f3f88Bd88CD28fb95df9628866149b1561528",
    // "0x51d4D761346B8ce4667896825dce39e8c9849D06",
    "0x4927a62feFE180f9E6307Ef5cb34f94FcAd09227",
    "0x97b1f6a13500de55B62b57B2D9e30Ca9E9bAB11B",
    "0x61e9B42f28cdF30173c591b2eB38023ed969d437"
  ]
  const rewardToken1Address = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"
  let syk: ERC20
  let xSyk: ERC20
  let rewardToken1: ERC20
  let rewardToken1Decimals: bigint
  let vaults: ERC20[] = []
  let controller: IGaugeController
  let blockNow: number
  let distributor: OrangeDistributor
  let s0: SignerWithAddress
  let s1: SignerWithAddress
  let s2: SignerWithAddress
  let s3: SignerWithAddress
  let s4: SignerWithAddress

  before(async () => {
    await deployments.fixture()
    controller = await ethers.getContractAt("IGaugeController", controllerAddress)
    vaults = await Promise.all(vaultAddresses.map(address => ethers.getContractAt("ERC20", address)))
    blockNow = (await ethers.provider.getBlock("latest"))!.number
    rewardToken1 = await ethers.getContractAt("ERC20", rewardToken1Address)
    rewardToken1Decimals = await rewardToken1.decimals()

    distributor = await ethers.getContractAt("OrangeDistributor", (await deployments.get("OrangeDistributor")).address)
    syk = await ethers.getContractAt("ERC20", await distributor.syk())
    xSyk = await ethers.getContractAt("ERC20", await distributor.xSyk())

    await addTokenBalance(rewardToken1Address, ethers.parseUnits("100000000", rewardToken1Decimals), await distributor.getAddress())

    const signers = await ethers.getSigners()
    s0 = signers[0]
    s1 = signers[1]
    s2 = signers[2]
    s3 = signers[3]
    s4 = signers[4]
  })

  describe("Normal token distribution", () => {
    it("Creates merkle root and proofs for distribution", async () => {
      const epoch0Reward = ethers.parseUnits("1000", rewardToken1Decimals)
      const epochData = {
        [s0.address]: {
          user: s0.address,
          rootId: 0,
          proofs: [],
          rewardAmount: epoch0Reward/3n,
          balance: 1n
        },
        [s1.address]: {
          user: s1.address,
          rootId: 0,
          proofs: [],
          rewardAmount: epoch0Reward/3n,
          balance: 1n
        },
        [s2.address]: {
          user: s2.address,
          rootId: 0,
          proofs: [],
          rewardAmount: epoch0Reward/3n,
          balance: 1n
        }
      }
      const {merkleTree, proofs} = createRootAndProofs(epochData)
  
      await distributor.updateMerkleRoot(vaultAddresses[0], rewardToken1Address, merkleTree.getHexRoot())
  
      const s0BalanceBefore = await rewardToken1.balanceOf(s0.address)
      await distributor.connect(s0).claim(vaultAddresses[0], rewardToken1Address, epoch0Reward/3n, proofs[s0.address])
      await expect(distributor.connect(s1).claim(vaultAddresses[0], rewardToken1Address, epoch0Reward/3n, proofs[s0.address])).to.be.revertedWithCustomError(distributor, "InvalidProof")
      const s0BalanceAfter = await rewardToken1.balanceOf(s0.address)
      expect(s0BalanceAfter - s0BalanceBefore).to.equal(epoch0Reward/3n)
    })
  
    it("Multi claim", async () => {
      const epoch1And2Reward = 2n * ethers.parseUnits("1000", rewardToken1Decimals)
      const epochData = {
        [s0.address]: {
          user: s0.address,
          rootId: 0,
          proofs: [],
          rewardAmount: epoch1And2Reward/3n,
          balance: 1n
        },
        [s1.address]: {
          user: s1.address,
          rootId: 0,
          proofs: [],
          rewardAmount: epoch1And2Reward/3n,
          balance: 1n
        },
        [s2.address]: {
          user: s2.address,
          rootId: 0,
          proofs: [],
          rewardAmount: epoch1And2Reward/3n,
          balance: 1n
        }
      }
      const {merkleTree, proofs} = createRootAndProofs(epochData)
  
      await distributor.updateMerkleRoot(vaultAddresses[0], rewardToken1Address, merkleTree.getHexRoot())
  
      const s0BalanceBefore = await rewardToken1.balanceOf(s0.address)
      await distributor.connect(s0).claim(vaultAddresses[0], rewardToken1Address, epoch1And2Reward / 6n, proofs[s0.address])
      const s0BalanceAfter = await rewardToken1.balanceOf(s0.address)
      expect(s0BalanceAfter - s0BalanceBefore).to.equal(epoch1And2Reward / 6n)
      
      const s1BalanceBefore = await rewardToken1.balanceOf(s1.address)
      await distributor.connect(s1).claim(vaultAddresses[0], rewardToken1Address, epoch1And2Reward / 3n, proofs[s1.address])
      const s1BalanceAfter = await rewardToken1.balanceOf(s1.address)
      expect(s1BalanceAfter - s1BalanceBefore).to.equal(epoch1And2Reward / 3n)


      // Batch claims
      await distributor.updateMerkleRoot(vaultAddresses[1], rewardToken1Address, merkleTree.getHexRoot())
      const balanceS2Before = await rewardToken1.balanceOf(s2.address)
      await distributor.connect(s2).batchClaim(
        [vaultAddresses[0], vaultAddresses[1]],
        [rewardToken1Address, rewardToken1Address],
        [epoch1And2Reward / 3n, epoch1And2Reward / 3n],
        [proofs[s2.address], proofs[s2.address]]
      )
      const balanceS2After = await rewardToken1.balanceOf(s2.address)
      expect(balanceS2After - balanceS2Before).to.closeTo(2n * epoch1And2Reward / 3n, 1n)
    })
  })

  describe("SYK distribution", () => {
    let gauges: IGauge[]
    before(async () => {
      const ownableGauges = await Promise.all(gaugeAddresses.map(address => ethers.getContractAt("OwnableUpgradeable", address)))
      await Promise.all(ownableGauges.map(async (gauge) => {
        const ownerAddress = await gauge.owner()
        await network.provider.request({
          method: "hardhat_impersonateAccount",
          params: [ownerAddress],
        });
        const owner = await ethers.getSigner(ownerAddress)
        await gauge.connect(owner).transferOwnership(distributor.getAddress())
      }))
      for (const [i, vault] of vaultAddresses.entries()) {
        await distributor.setGauge(vault, gaugeAddresses[i])
      }

      const modifiedGaugeFactory = await ethers.getContractFactory("GaugeType1")
      const modifiedGauge = await modifiedGaugeFactory.deploy()
      const code = await hre.network.provider.send("eth_getCode", [
        await modifiedGauge.getAddress(),
      ]);
      for (const gauge of gaugeAddresses) {
        await hre.network.provider.send("hardhat_setCode", [
          gauge,
          code,
        ]);
        const newGauge = await ethers.getContractAt("GaugeType1", gauge)
        await newGauge.initialize(ethers.ZeroAddress, controllerAddress, await distributor.syk())
        await newGauge.transferOwnership(distributor.getAddress())
      }

      // Whitelist distributor for xSYK
      const xSYK = await ethers.getContractAt("IXStrykeToken", await distributor.xSyk())
      const authorityAddress = "0xf885390B75035e94ac72AeF3E0D0eD5ec3b85d37"
      await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [authorityAddress],
      });
      const authority = await ethers.getSigner(authorityAddress)
      await network.provider.send("hardhat_setBalance", [
        authorityAddress,
        "0x10000000000000000000000000000000",
      ]);
      await xSYK.connect(authority).updateContractWhitelist(distributor.getAddress(), true)

    })

    it("Shows that an epoch reward can be pulled", async () => {
      for (const vault of vaultAddresses) {
        const canPull = await distributor.canPullNext(vault)
        expect(canPull).to.be.true
      }
    })

    it("Pulls rewards from gauge", async () => {
      // const errorFactory = await ethers.getContractFactory("Errors")
      // const errorsContract = await errorFactory.deploy()
      // console.log(errorsContract.interface.getError("0xe4529edb"));
      const syk: ERC20 = await ethers.getContractAt("ERC20", await distributor.syk())
      for (const vault of vaultAddresses) {
        const balanceBefore = await syk.balanceOf(distributor.getAddress())
        await distributor.pullNext(vault)
        const balanceAfter = await syk.balanceOf(distributor.getAddress())
        expect(balanceAfter).to.greaterThan(balanceBefore)
        expect(await distributor.canPullNext(vault)).to.be.false
      }
    })

    it("Distributes syk and xSyk to users", async () => {
      for (const vault of vaultAddresses) {
        const epoch0Reward = await distributor.epochRewards(vault, 0)

        const epochData = {
          [s0.address]: {
            user: s0.address,
            rootId: 0,
            proofs: [],
            rewardAmount: epoch0Reward / 4n,
            balance: 1n
          },
          [s1.address]: {
            user: s1.address,
            rootId: 0,
            proofs: [],
            rewardAmount: epoch0Reward / 4n,
            balance: 1n
          },
          [s2.address]: {
            user: s2.address,
            rootId: 0,
            proofs: [],
            rewardAmount: epoch0Reward / 2n,
            balance: 1n
          }
        }
        const {merkleTree, proofs} = createRootAndProofs(epochData)
    
        await distributor.updateMerkleRoot(vault, await distributor.syk(), merkleTree.getHexRoot())
    
        await distributor.connect(s0).claim(vault, await distributor.syk(), epoch0Reward / 4n, proofs[s0.address])
        await distributor.connect(s1).claim(vault, await distributor.syk(), epoch0Reward / 4n, proofs[s1.address])
        await distributor.connect(s2).claim(vault, await distributor.syk(), epoch0Reward / 2n, proofs[s2.address])
        const s0BalanceAfterSyk = await syk.balanceOf(s0.address)
        const s0BalanceAfterxSyk = await xSyk.balanceOf(s0.address)
        const s1BalanceAfterSyk = await syk.balanceOf(s1.address)
        const s1BalanceAfterxSyk = await xSyk.balanceOf(s1.address)
        const s2BalanceAfterSyk = await syk.balanceOf(s2.address)
        const s2BalanceAfterxSyk = await xSyk.balanceOf(s2.address)

        expect(s1BalanceAfterSyk).to.closeTo(s0BalanceAfterSyk, 1n)
        expect(s2BalanceAfterSyk).to.closeTo(s0BalanceAfterSyk * 2n, 1n)
        expect(s1BalanceAfterxSyk).to.closeTo(s0BalanceAfterxSyk, 1n)
        expect(s2BalanceAfterxSyk).to.closeTo(s0BalanceAfterxSyk * 2n, 1n)
      }
      expect(await syk.balanceOf(distributor.getAddress())).to.lessThan(10n)
    })

    it("Skips pulling some epochs for syk", async () => {
      for (const vault of vaultAddresses) {
        await distributor.skipPulls(vault, 10)
        expect(await distributor.nextStrykeEpochToPull(vault)).to.equal(10)
      }
    })
  })

  it("Withdraws tokens during emergency", async () => {
    await addTokenBalance(rewardToken1Address, 1000n, await distributor.getAddress())
    const balanceBefore = await rewardToken1.balanceOf(s0.address)
    await distributor.emergencyWithdrawal(rewardToken1Address, 1000n)
    const balanceAfter = await rewardToken1.balanceOf(s0.address)
    expect(balanceAfter - balanceBefore).to.equal(1000n)
  })

  it("Updates keeper", async () => {
    await distributor.setKeeper((await ethers.getSigners())[3])
    expect(await distributor.keeper()).to.equal((await ethers.getSigners())[3])
  })

  it("Rejects unauthorized transactions", async () => {
    const attacker = (await ethers.getSigners())[5]
    await expect(distributor.initialize(ethers.ZeroAddress, ethers.ZeroAddress, [], [])).to.be.revertedWithCustomError(distributor, "InvalidInitialization")
    await expect(distributor.connect(attacker).setGauge(ethers.ZeroAddress, ethers.ZeroAddress)).to.be.revertedWithCustomError(distributor, "OwnableUnauthorizedAccount")
    await expect(distributor.connect(attacker).skipPulls(ethers.ZeroAddress, 0)).to.be.revertedWithCustomError(distributor, "OwnableUnauthorizedAccount")
    await expect(distributor.connect(attacker).setKeeper(ethers.ZeroAddress)).to.be.revertedWithCustomError(distributor, "OwnableUnauthorizedAccount")
    await expect(distributor.connect(attacker).pullNext(ethers.ZeroAddress)).to.be.revertedWithCustomError(distributor, "Unauthorized")
    await expect(distributor.connect(attacker).updateMerkleRoot(ethers.ZeroAddress, ethers.ZeroAddress, ethers.randomBytes(32))).to.be.revertedWithCustomError(distributor, "Unauthorized")
    await expect(distributor.connect(attacker).emergencyWithdrawal(ethers.ZeroAddress, 100n)).to.be.revertedWithCustomError(distributor, "OwnableUnauthorizedAccount")

    const {deploy} = deployments;
    await expect(deploy("OrangeDistributor2", {
      from: (await ethers.getSigners())[0].address,
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
    })).to.be.revertedWithCustomError(distributor, "VaultGaugeArrayMismatch")
  })
  console.log("CHECK2")
});
