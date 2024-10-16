// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IGauge} from "./interfaces/IGauge.sol";
import {IGaugeController} from "./interfaces/IGaugeController.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

abstract contract SYKPuller is OwnableUpgradeable {

    event SetGauge(address indexed _vault, address indexed _gauge);
    event RewardPulled(address indexed _vault, uint _amount);
    event SkipPulls(address indexed _vault, uint _nextEpochToPull);

    error InvalidEpoch();

    mapping (address => uint) public nextStrykeEpochToPull;
    mapping (address => mapping (uint => uint)) public epochRewards;
    mapping (address => address) public gauges;
    IGaugeController public controller;
    address public syk;
    address public xSyk;

    constructor() {}

    function __SYKPuller_init (IGaugeController _controller) internal initializer {
        __Ownable_init();
        controller = _controller;
        syk = controller.syk();
        xSyk = controller.xSyk();
    }

    function canPullNext(address _vault) external view returns (bool) {
        return controller.epochFinalized(nextStrykeEpochToPull[_vault]);
    }

    function setGauge(address _vault, address _gauge) external onlyOwner {
        gauges[_vault] = _gauge;
        emit SetGauge(_vault, _gauge);
    }

    function skipPulls(address _vault, uint _nextEpochToPull) external onlyOwner {
        nextStrykeEpochToPull[_vault] = _nextEpochToPull;
        emit SkipPulls(_vault, _nextEpochToPull);
    }

    function pullNext(address _vault) external onlyOwner {
        uint balanceBefore = ERC20(syk).balanceOf(address(this));
        IGauge(gauges[_vault]).pull(nextStrykeEpochToPull[_vault]);
        uint balanceAfter = ERC20(syk).balanceOf(address(this));
        epochRewards[_vault][nextStrykeEpochToPull[_vault]] = balanceAfter - balanceBefore;
        nextStrykeEpochToPull[_vault]+=1;
        emit RewardPulled(_vault, balanceAfter - balanceBefore);
    }
}
