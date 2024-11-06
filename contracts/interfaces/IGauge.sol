// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

interface IGauge {
    function pull(uint _epoch) external;
}