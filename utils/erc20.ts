import { ethers, network } from 'hardhat'
import { IERC20 } from '../typechain-types'

ethers.AbiCoder.defaultAbiCoder().encode
const encode = (types: any, values: any) =>
  ethers.AbiCoder.defaultAbiCoder().encode(types, values)

const cachedBalanceSlots: { [token: string]: number } = {}

async function findBalancesSlot(account: string, tokenAddress: string) {
  const probeA = encode(['uint256'], [100])
  const probeB = encode(['uint256'], [200])
  const token = await ethers.getContractAt('IERC20', tokenAddress)
  for (let i = 0; i < 1000; i++) {
    let probedSlot = ethers.keccak256(
      encode(['address', 'uint256'], [account, i]),
    )
    // remove padding for JSON RPC
    while (probedSlot.startsWith('0x0')) probedSlot = '0x' + probedSlot.slice(3)
    const prev = await network.provider.send('eth_getStorageAt', [
      tokenAddress,
      probedSlot,
      'latest',
    ])
    // make sure the probe will change the slot value
    const probe = prev === probeA ? probeB : probeA

    await network.provider.send('hardhat_setStorageAt', [
      tokenAddress,
      probedSlot,
      probe,
    ])

    const balance = await token.balanceOf(account)
    // reset to previous value
    await network.provider.send('hardhat_setStorageAt', [
      tokenAddress,
      probedSlot,
      prev,
    ])
    if (balance === BigInt(probe)) return i
  }
  throw 'Balances slot not found!'
}

export async function addTokenBalance(
  tokenAddress: string,
  balance: bigint,
  account: string,
) {
  const token: IERC20 = await ethers.getContractAt('IERC20', tokenAddress)
  const balanceBefore = await token.balanceOf(account)
  let slot = cachedBalanceSlots[tokenAddress]
  if (!slot) {
    slot = await findBalancesSlot(account, tokenAddress)
    cachedBalanceSlots[tokenAddress] = slot
  }
  let probedSlot = ethers.keccak256(
    encode(['address', 'uint256'], [account, slot]),
  )
  // remove padding for JSON RPC
  while (probedSlot.startsWith('0x0')) probedSlot = '0x' + probedSlot.slice(3)
  await network.provider.send('hardhat_setStorageAt', [
    tokenAddress,
    probedSlot,
    encode(['uint256'], [balance + balanceBefore]),
  ])
}
