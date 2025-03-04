// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IGauge} from "./interfaces/IGauge.sol";
import {IGaugeController} from "./interfaces/IGaugeController.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @notice Abstract contract with logic for pulling rewards
 * from stryke reward gauges
 *
 * @dev The SYKPuller contract needs to be made the owner of the gauges
 * that it will be pulling rewards from
 */
abstract contract SYKPuller is OwnableUpgradeable {

    event SetGauge(address indexed _vault, address indexed _gauge);
    event RewardPulled(address indexed _vault, uint _amount);
    event SkipPulls(address indexed _vault, uint _nextEpochToPull);
    event SetKeeper(address indexed _keeper);
    event SetController(address _previousController, address _newController);

    error Unauthorized();
    error VaultGaugeArrayMismatch();

    // Mapping from vault to next reward epoch to pull
    mapping (address => uint) public nextStrykeEpochToPull;

    // Mapping from vault to epoch to tokens rewarded
    mapping (address => mapping (uint => uint)) public epochRewards;

    // Mapping from vault to gauge
    mapping (address => address) public gauges;

    // Stryke gauge controller
    IGaugeController public controller;

    address public keeper;

    // Stryke tokens
    address public syk;
    address public xSyk;

    function __SYKPuller_init (address _keeper) internal initializer {
        __Ownable_init(msg.sender);
        keeper = _keeper;
        emit SetKeeper(_keeper);
    }

    modifier restricted() {
        require(msg.sender==keeper || msg.sender==owner(), Unauthorized());
        _;
    }

    /**
     * @notice Check if the rewards for the next epoch can be pulled
     */
    function canPullNext(address _vault) external view returns (bool) {
        return controller.epochFinalized(nextStrykeEpochToPull[_vault]);
    }

    function setController(IGaugeController _controller) external onlyOwner {
        emit SetController(address(controller), address(_controller));
        controller = _controller;
        syk = controller.syk();
        xSyk = controller.xSyk();
    }

    /**
     * @notice Set the gauge for an orange vault
     * @dev SYKPuller needs to be made the owner of the gauge, to allow
     * pulling reward
     */
    function setGauge(address _vault, address _gauge) external onlyOwner {
        gauges[_vault] = _gauge;
        emit SetGauge(_vault, _gauge);
    }

    /**
     * @notice Update keeper address
     */
    function setKeeper(address _keeper) external onlyOwner {
        keeper = _keeper;
        emit SetKeeper(_keeper);
    }

    /**
     * @notice Admin function to manually set the next epoch whose rewards
     * will be pulled.
     */
    function skipPulls(address _vault, uint _nextEpochToPull) external onlyOwner {
        nextStrykeEpochToPull[_vault] = _nextEpochToPull;
        emit SkipPulls(_vault, _nextEpochToPull);
    }

    /**
     * @notice Pull the rewards for the next epoch from the gauge
     */
    function pullNext(address _vault) external restricted {
        uint nextEpoch = nextStrykeEpochToPull[_vault]++;
        uint balanceBefore = ERC20(syk).balanceOf(address(this));
        IGauge(gauges[_vault]).pull(nextEpoch);
        uint balanceAfter = ERC20(syk).balanceOf(address(this));
        epochRewards[_vault][nextEpoch] = balanceAfter - balanceBefore;
        emit RewardPulled(_vault, balanceAfter - balanceBefore);
    }
}
