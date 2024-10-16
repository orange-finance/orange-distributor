// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

contract Errors {
    /// @dev Error thrown when trying to pull rewards for a gauge in the current epoch.
    error GaugeController_EpochActive();

    /// @dev Error thrown when the total reward available is insufficient to cover the base rewards.
    error GaugeController_NotEnoughRewardAvailable();

    /// @dev Error thrown when an account does not have enough power to vote as requested.
    error GaugeController_NotEnoughPowerAvailable();

    /// @dev Error thrown when an invalid gauge address is provided.
    error GaugeController_InvalidGauge();

    /// @dev Error thrown when a gauge is already added.
    error GaugeController_GaugeAlreadyAdded();

    /// @dev Error thrown when an action is attempted on a gauge that does not exist.
    error GaugeController_GaugeNotFound();

    /// @dev Error thrown when the msg.sender for pull() is not a gauge or a approved bridge adapter.
    error GaugeController_NotGauge();

    /// @dev Error thrown when a gauge tries to pull rewards for an epoch which already had its rewards pulled.
    error GaugeController_RewardAlreadyPulled();

    error GaugeController_IncorrectEpoch();

    error GaugeController_EpochNotFinalized();


    
    /// @dev Emitted when incorrect ratio values are provided for redeem settings.
    error XStrykeToken_WrongRatioValues();

    /// @dev Emitted when incorrect duration values are provided for redeem settings.
    error XStrykeToken_WrongDurationValues();

    /// @dev Emitted when the provided amount for a transaction cannot be zero.
    error XStrykeToken_AmountZero();

    /// @dev Emitted when the provided duration for vesting is below the minimum allowed.
    error XStrykeToken_DurationTooLow();

    /// @dev Emitted when the provided address for whitelist is the xSYK address itself.
    error XStrykeToken_InvalidWhitelistAddress();

    /// @dev Emitted when someone tries to redeem before their vesting is completed.
    error XStrykeToken_VestingHasNotMatured();

    /// @dev Emitted when someone tries to redeem a non-active vesting.
    error XStrykeToken_VestingNotActive();

    /// @dev Emitted when a transfer of xSYK is happening between non-whitelisted accounts.
    error XStrykeToken_TransferNotAllowed();

    /// @dev Emitted when msg.sender is not the account owner of the vest
    error XStrykeToken_SenderNotOwner();
}
