import { ethers } from "hardhat";
import keccak256 from "keccak256";
import MerkleTree from "merkletreejs";

export interface EpochEndUserData {
  user: string;
  rootId: number;
  proofs: string[];
  rewardAmount: bigint;
  balance: bigint;
}

// Balance, reward amounts and merkle proof at the end of an epoch for an address
type EpochEndData = { [address: string]: EpochEndUserData }

export const createRootAndProofs = (epochEndData: EpochEndData) => {
  const addresses = Object.keys(epochEndData)

  const leafNodes = addresses.map((address) =>
    ethers.solidityPackedKeccak256(["address", "uint256"], [address, epochEndData[address].rewardAmount])
  );

  const merkleTree = new MerkleTree(leafNodes, keccak256, { sortPairs: true })
  const proofs: { [address: string]: string[] } = leafNodes.reduce(
    (aggregate, leaf, idx) => ({
      ...aggregate,
      [addresses[idx]]: merkleTree.getHexProof(leaf),
    }),
    {}
  )
  return { merkleTree, proofs }
}