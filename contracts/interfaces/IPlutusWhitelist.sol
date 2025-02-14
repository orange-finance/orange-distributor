// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

interface IPlutusWhitelist {
    function addToWhitelist(address _address) external;
}