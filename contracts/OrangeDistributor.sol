// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ISYKDepositor} from "./interfaces/ISYKDepositor.sol";
import {SYKPuller} from "./SYKPuller.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

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
contract OrangeDistributor is UUPSUpgradeable, PausableUpgradeable, SYKPuller {
    using SafeERC20 for IERC20;

    event MerkleRootUpdated(address indexed _vault, address indexed _token, bytes32 _newMerkleRoot);
    event RewardClaimed(address indexed _user, address indexed _vault, address indexed token, uint _amount);
    event SetSykDepositor(address _previousDepositor, address _newDepositor);

    error InvalidProof();
    error ZeroAddressSykDepositor();
    error ZeroAddressToken();

    // Plutus depositor
    ISYKDepositor public sykDepositor;
    
    // Mapping from vault to token to merkle root
    mapping (address => mapping (address => bytes32)) public merkleRoot;

    // Mapping from vault to depositor to token to amount of token claimed
    mapping (address => mapping (address => mapping (address => uint))) public claimed;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _keeper) external initializer {
        __SYKPuller_init(_keeper);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function setSykDepositor(ISYKDepositor _sykDepositor) external onlyOwner {
        if (address(_sykDepositor)==address(0)) revert ZeroAddressSykDepositor();
        emit SetSykDepositor(address(sykDepositor), address(_sykDepositor));
        sykDepositor = _sykDepositor;
    }

    /**
     * @notice Claim all the token rewards for a vault
     * @param _vault The vault for which to claim rewards
     * @param _token The token to claim
     * @param _amount Amount of token to claim as reward
     * @param merkleProof Merkle proof
     */
    function claim(address _vault, address _token, uint256 _amount, bytes32[] calldata merkleProof) public whenNotPaused {
        claimed[_vault][_token][msg.sender]+=_amount;
        
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, claimed[_vault][_token][msg.sender]));
        require(MerkleProof.verifyCalldata(merkleProof, merkleRoot[_vault][_token], leaf), InvalidProof());

        if (_token==syk) {
            // plsSYK transfer
            uint plsSykAmount = _amount>2e16?_amount/2:0;
            uint sykAmount = _amount - plsSykAmount;
            if (plsSykAmount>0) {
                IERC20(syk).safeIncreaseAllowance(address(sykDepositor), plsSykAmount);
                sykDepositor.deposit(plsSykAmount);
                IERC20(sykDepositor.minter()).safeTransfer(msg.sender, plsSykAmount);
            }

            IERC20(_token).safeTransfer(msg.sender, sykAmount);
        } else {
            IERC20(_token).safeTransfer(msg.sender, _amount);
        }

        emit RewardClaimed(msg.sender, _vault, _token, _amount);
    }

    /**
     * @notice Claim multiple token rewards in a single call
     */
    function batchClaim(address[] calldata _vaults, address[] calldata _tokens, uint256[] calldata _amounts, bytes32[][] calldata merkleProofs) external whenNotPaused {
        for (uint i = 0; i<_vaults.length; i++) {
            claim(_vaults[i], _tokens[i], _amounts[i], merkleProofs[i]);
        }
    }

    /**
     * @notice Update the merkle root for the reward token distribution of a vault
     * @param _vault The vault whose token is to be distributed using the merkle root
     * @param _token The reward token for the vault
     * @param _merkleRoot New root for reward distribution
     */
    function updateMerkleRoot(address _vault, address _token, bytes32 _merkleRoot) external restricted {
        if (_vault==address(0)) revert ZeroAddressVault();
        if (_token==address(0)) revert ZeroAddressToken();
        merkleRoot[_vault][_token] = _merkleRoot;
        emit MerkleRootUpdated(_vault, _token, _merkleRoot);
    }

    /**
     * @notice Pause reward claims
     */
    function pause() external restricted {
        _pause();
    }
    
    /**
     * @notice Unpause reward claims
     */
    function unpause() external restricted {
        _unpause();
    }

    /**
     * @notice Withdraw funds in case of emergency
     */
    function emergencyWithdrawal(address _token, uint _amount) external onlyOwner {
        IERC20(_token).safeTransfer(owner(), _amount);
    }
}
