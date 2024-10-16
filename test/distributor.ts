import { expect } from "chai";
import hre, { deployments, ethers, network } from "hardhat";
import { ERC20, GaugeType1, IERC20, IGauge, IGaugeController, OrangeDistributor, OwnableUpgradeable } from "../typechain-types";
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
      const epoch0Reward = ethers.parseUnits("100000", rewardToken1Decimals) / 5n
      const epochData = {
        [s0.address]: {
          user: s0.address,
          rootId: 0,
          proofs: [],
          rewardAmount: epoch0Reward,
          balance: 1n
        },
        [s1.address]: {
          user: s1.address,
          rootId: 0,
          proofs: [],
          rewardAmount: epoch0Reward,
          balance: 1n
        },
        [s2.address]: {
          user: s2.address,
          rootId: 0,
          proofs: [],
          rewardAmount: epoch0Reward,
          balance: 1n
        }
      }
      const {merkleTree, proofs} = createRootAndProofs(epochData)
  
      await distributor.updateMerkleRoot(vaultAddresses[0], rewardToken1Address, {root: merkleTree.getHexRoot(), distributionStartBlock: 0, distributionEndBlock: 999})
  
      const s0BalanceBefore = await rewardToken1.balanceOf(s0.address)
      await distributor.connect(s0).claim(vaultAddresses[0], rewardToken1Address, epoch0Reward, proofs[s0.address])
      await expect(distributor.connect(s1).claim(vaultAddresses[0], rewardToken1Address, epoch0Reward, proofs[s0.address])).to.be.revertedWithCustomError(distributor, "InvalidProof")
      const s0BalanceAfter = await rewardToken1.balanceOf(s0.address)
      expect(s0BalanceAfter - s0BalanceBefore).to.equal(epoch0Reward)
    })
  
    it("Allows users to claim rewards for next epoch and prior epoch", async () => {
      const epoch1And2Reward = 2n * ethers.parseUnits("100000", rewardToken1Decimals) / 5n
      const epochData = {
        [s0.address]: {
          user: s0.address,
          rootId: 0,
          proofs: [],
          rewardAmount: epoch1And2Reward,
          balance: 1n
        },
        [s1.address]: {
          user: s1.address,
          rootId: 0,
          proofs: [],
          rewardAmount: epoch1And2Reward,
          balance: 1n
        },
        [s2.address]: {
          user: s2.address,
          rootId: 0,
          proofs: [],
          rewardAmount: epoch1And2Reward,
          balance: 1n
        }
      }
      const {merkleTree, proofs} = createRootAndProofs(epochData)
  
      await distributor.updateMerkleRoot(vaultAddresses[0], rewardToken1Address, {root: merkleTree.getHexRoot(), distributionStartBlock: 0, distributionEndBlock: 999})
  
      const s0BalanceBefore = await rewardToken1.balanceOf(s0.address)
      await distributor.connect(s0).claim(vaultAddresses[0], rewardToken1Address, epoch1And2Reward / 2n, proofs[s0.address])
      const s0BalanceAfter = await rewardToken1.balanceOf(s0.address)
      expect(s0BalanceAfter - s0BalanceBefore).to.equal(epoch1And2Reward / 2n)
      
      const s1BalanceBefore = await rewardToken1.balanceOf(s1.address)
      await distributor.connect(s1).claim(vaultAddresses[0], rewardToken1Address, epoch1And2Reward, proofs[s1.address])
      const s1BalanceAfter = await rewardToken1.balanceOf(s1.address)
      expect(s1BalanceAfter - s1BalanceBefore).to.equal(epoch1And2Reward)
    })
  })
});
