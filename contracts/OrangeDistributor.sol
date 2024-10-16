// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IGauge} from "./interfaces/IGauge.sol";
import {IGaugeController} from "./interfaces/IGaugeController.sol";
import {SYKPuller} from "./SYKPuller.sol";
import {IXStrykeToken} from "./interfaces/IXStrykeToken.sol";

contract OrangeDistributor is SYKPuller {
    using SafeERC20 for IERC20;

    struct MerkleRootData {
        bytes32 root;
        uint distributionStartBlock;
        uint distributionEndBlock;
    }

    event MerkleRootUpdated(address indexed _vault, address indexed _token, MerkleRootData _newMerkleRoot);
    event RewardClaimed(address indexed _user, address indexed _vault, address indexed token, uint _amount);

    error InvalidProof();

    // Mapping from vault to token to merkle root
    mapping (address => mapping (address => MerkleRootData)) merkleRootData;

    // Mapping from vault to depositor to token to amount of token claimed
    mapping (address => mapping (address => mapping (address => uint))) claimed;

    // Mapping from vault to token to total amount of token rewarded
    mapping (address => mapping (address => uint)) totalReward;

    constructor() {}

    function initialize(IGaugeController _controller) external initializer {
        __SYKPuller_init(_controller);
    }

    function claim(address _vault, address _token, uint256 _amount, bytes32[] calldata merkleProof) external {
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

    function updateMerkleRoot(address _vault, address _token, MerkleRootData memory _merkleData) external onlyOwner {
        merkleRootData[_vault][_token] = _merkleData;
        emit MerkleRootUpdated(_vault, _token, _merkleData);
    }
}
