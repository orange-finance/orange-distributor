// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IGauge} from "./interfaces/IGauge.sol";
import {IGaugeController} from "./interfaces/IGaugeController.sol";
import {SYKPuller} from "./SYKPuller.sol";
import {IXStrykeToken} from "./interfaces/IXStrykeToken.sol";

/**
 * @notice Contract for distributing token rewards to Orange vault
 * depositors. The contract is able to distribute token rewards
 * distributed by stryke via their gauges as well as any ERC20 token
 * transferred to the OrangeDistributor contract
 *
 * @dev In order to distribute token rewards for an orange vault, the
 * reward amounts need to be calculated for the vault depositors off-
 * chain. The total reward amount should be sent to the distributor
 * contract, either by calling pullNext for syk rewards or transferring
 * the tokens directly to the distributor. A merkle root then needs to be 
 * calculated based on the amount of tokens that are to be distributed to
 * each vault depositor (this is performed off chain) and sent to the 
 * distributor contract via updateMerkleRoot
 */
contract OrangeDistributor is SYKPuller {
    using SafeERC20 for IERC20;

    struct MerkleRootData {
        bytes32 root;           // Merkle root for distributing reward token
        uint rewardAmount;      // Total amount of reward token to be distributed
    }

    event MerkleRootUpdated(address indexed _vault, address indexed _token, MerkleRootData _newMerkleRoot);
    event RewardClaimed(address indexed _user, address indexed _vault, address indexed token, uint _amount);

    error InvalidProof();
    error InvalidRewardAmount();

    // Mapping from vault to token to merkle root
    mapping (address => mapping (address => MerkleRootData)) public merkleRootData;

    // Mapping from vault to depositor to token to amount of token claimed
    mapping (address => mapping (address => mapping (address => uint))) public claimed;

    constructor() {}

    function initialize(IGaugeController _controller) external initializer {
        __SYKPuller_init(_controller);
    }

    /**
     * @notice Claim all the token rewards for a vault
     * @param _vault The vault for which to claim rewards
     * @param _token The token to claim
     * @param _amount Amount of token to claim as reward
     * @param merkleProof Merkle proof
     */
    function claim(address _vault, address _token, uint256 _amount, bytes32[] calldata merkleProof) public {
        claimed[_vault][_token][msg.sender]+=_amount;
        
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, claimed[_vault][_token][msg.sender]));
        if (!MerkleProof.verifyCalldata(merkleProof, merkleRootData[_vault][_token].root, leaf)) revert InvalidProof();

        if (_token==syk) {
            IERC20(syk).safeIncreaseAllowance(xSyk, _amount/2);
            IXStrykeToken(xSyk).convert(_amount / 2, msg.sender);
            IERC20(_token).safeTransfer(msg.sender, _amount/2);
        } else {
            IERC20(_token).safeTransfer(msg.sender, _amount);
        }

        emit RewardClaimed(msg.sender, _vault, _token, _amount);
    }

    /**
     * @notice Claim multiple token rewards in a single call
     */
    function batchClaim(address[] calldata _vaults, address[] calldata _tokens, uint256[] calldata _amounts, bytes32[][] calldata merkleProofs) external {
        for (uint i = 0; i<_vaults.length; i++) {
            claim(_vaults[i], _tokens[i], _amounts[i], merkleProofs[i]);
        }
    }

    /**
     * @notice Update the merkle root for the reward token distribution of a vault
     * @param _vault The vault whose token is to be distributed using the merkle root
     * @param _token The reward token for the vault
     * @param _merkleData Struct containing merkle root and total reward amount to be distributed
     *
     * @dev _merkleData.rewardAmount should be the total amount of reward distributed for
     * the vault since inception rather than the amount of reward distributed for a
     * particular epoch
     */
    function updateMerkleRoot(address _vault, address _token, MerkleRootData memory _merkleData) external onlyOwner {
        // Sanity check, the total amount of tokens rewarded can't go down over time
        if (_merkleData.rewardAmount < merkleRootData[_vault][_token].rewardAmount) revert InvalidRewardAmount();
        merkleRootData[_vault][_token] = _merkleData;
        emit MerkleRootUpdated(_vault, _token, _merkleData);
    }

    /**
     * @notice Withdraw funds in case of emergency
     */
    function emergencyWithdrawal(address _token, uint _amount) external onlyOwner {
        IERC20(_token).safeTransfer(owner(), _amount);
    }
}
