// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title $SIGNAL — Token of the Arena
/// @notice ERC20 with permit and a 1% arena fee on transfers.
///         The Arena contract is whitelisted to avoid fees during bets/settlements.
contract SignalToken is ERC20, ERC20Permit, Ownable {
    uint256 public constant ARENA_FEE = 100; // 1% (basis points: 100 = 1%)
    uint256 public constant TOTAL_SUPPLY = 100_000_000 * 10 ** 18; // 100M tokens

    mapping(address => bool) public whitelist;
    address public feeCollector;

    event WhitelistUpdated(address indexed account, bool status);
    event FeeCollected(address indexed from, address indexed to, uint256 amount);

    constructor(address _feeCollector)
        ERC20("Signal", "SIGNAL")
        ERC20Permit("Signal")
        Ownable(msg.sender)
    {
        require(_feeCollector != address(0), "Invalid fee collector");
        feeCollector = _feeCollector;
        whitelist[msg.sender] = true;
        _mint(msg.sender, TOTAL_SUPPLY);
    }

    /// @notice Whitelist an address to bypass transfer fees (e.g. the Arena contract)
    function setWhitelist(address account, bool status) external onlyOwner {
        whitelist[account] = status;
        emit WhitelistUpdated(account, status);
    }

    /// @notice Update the fee collector address
    function setFeeCollector(address _feeCollector) external onlyOwner {
        require(_feeCollector != address(0), "Invalid fee collector");
        feeCollector = _feeCollector;
    }

    /// @notice Transfers with 1% fee unless sender or receiver is whitelisted
    function transfer(address to, uint256 amount) public override returns (bool) {
        _transferWithFee(msg.sender, to, amount);
        return true;
    }

    /// @notice transferFrom with 1% fee unless sender or receiver is whitelisted
    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        _spendAllowance(from, msg.sender, amount);
        _transferWithFee(from, to, amount);
        return true;
    }

    function _transferWithFee(address from, address to, uint256 amount) internal {
        if (whitelist[from] || whitelist[to]) {
            _transfer(from, to, amount);
            return;
        }

        uint256 fee = (amount * ARENA_FEE) / 10000;
        uint256 net = amount - fee;

        _transfer(from, feeCollector, fee);
        _transfer(from, to, net);

        emit FeeCollected(from, feeCollector, fee);
    }
}
