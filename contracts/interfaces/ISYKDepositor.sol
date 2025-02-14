// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

interface ISYKDepositor {
    function minter() external returns (address);
    function deposit(uint256 _amount) external;
    function handleDepositFor(address _user, uint256 _amount) external;
}