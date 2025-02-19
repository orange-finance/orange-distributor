// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.27;

enum VestStatus {
    INACTIVE,
    ACTIVE,
    REDEEMED,
    CANCELLED
}

struct VestData {
    address account; // The account participating in the vesting (Owner of the vest).
    uint256 sykAmount; // SYK amount to be received upon vesting completion.
    uint256 xSykAmount; // xSYK amount being redeemed for SYK.
    uint256 maturity; // Timestamp when the vesting period ends.
    VestStatus status; // Current status of the vesting process.
}

struct RedeemSettings {
    uint256 minRatio; // Minimum conversion ratio from xSYK to SYK.
    uint256 maxRatio; // Maximum conversion ratio from xSYK to SYK.
    uint256 minDuration; // Minimum duration for vesting.
    uint256 maxDuration; // Maximum duration for vesting.
}

interface IXStrykeToken {
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

    /// @notice  Emitted when the excess receiver is updated.
    /// @param excessReceiver The new excess receiver address
    event ExcessReceiverUpdated(address excessReceiver);

    /// @notice Emitted when redeem settings are updated.
    /// @param redeemSettings The new redeem settings applied.
    event RedeemSettingsUpdated(RedeemSettings redeemSettings);

    /// @notice Emitted when an account's whitelist status is updated.
    /// @param account The account whose whitelist status is updated.
    /// @param add Boolean indicating whether the account was added to (true) or removed from (false) the whitelist.
    event WhitelistUpdated(address account, bool add);

    /// @notice Emitted when SYK tokens are converted to xSYK tokens.
    /// @param from The address of the account converting SYK to xSYK.
    /// @param to The address of the account receiving the xSYK tokens.
    /// @param amount The amount of SYK tokens being converted.
    event Converted(address indexed from, address to, uint256 amount);

    /// @notice Emitted when xSYK tokens are vested for SYK redemption.
    /// @param account The account initiating the vest.
    /// @param xSykAmount The amount of xSYK tokens vested.
    /// @param sykAmount The amount of SYK tokens to be received upon vest completion.
    /// @param duration The duration of the vest in seconds.
    /// @param vestIndex The vest index
    event Vested(address indexed account, uint256 xSykAmount, uint256 sykAmount, uint256 duration, uint256 vestIndex);

    /// @notice Emitted when vested xSYK tokens are redeemed for SYK.
    /// @param account The account redeeming the vested xSYK.
    /// @param xSykAmount The amount of xSYK tokens redeemed.
    /// @param sykAmount The amount of SYK tokens received in exchange.
    event Redeemed(address indexed account, uint256 xSykAmount, uint256 sykAmount);

    /// @notice Emitted when a vesting operation is cancelled.
    /// @param account The account cancelling the vest.
    /// @param vestIndex The index of the vesting operation being cancelled.
    /// @param xSykAmount The amount of xSYK associated with the cancelled vest.
    event VestCancelled(address indexed account, uint256 vestIndex, uint256 xSykAmount);

    function authority() external view returns (address);

    function setAuthority(address newAddress) external;

    function updateContractWhitelist(address _contract, bool _add) external;

    /// @notice Converts SYK to xSYK
    /// @param _amount amount of SYK to convert to xSYK
    /// @param _to address of the receiving account
    function convert(uint256 _amount, address _to) external;

    /// @notice Vest xSYK to get back SYK
    /// @param _amount amount of xSYK to vest for getting back SYK
    /// @param _duration duration of the vesting
    function vest(uint256 _amount, uint256 _duration) external;

    /// @notice Redeem vested xSYK
    /// @param _vestIndex Index of the vest
    function redeem(uint256 _vestIndex) external;

    /// @notice Cancel a redeem vested xSYK
    /// @param _vestIndex Index of the vest
    function cancelVest(uint256 _vestIndex) external;
}