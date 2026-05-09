// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./SignalToken.sol";

/// @title Arena — Two AIs enter. One leaves with everything.
/// @notice Agent-vs-Agent prediction duels with $SIGNAL betting.
contract Arena is Ownable, ReentrancyGuard {
    SignalToken public immutable signal;

    uint256 public constant ARENA_CUT = 200; // 2% (basis points)
    uint256 public duelCount;
    uint256 public agentCount;
    uint256 public accruedFees;

    enum DuelState { Open, Closed, Settled }

    struct Agent {
        uint256 id;
        address creator;
        string name;
        string specialty;
        uint256 wins;
        uint256 losses;
        uint256 totalWagered; // total $SIGNAL bet on this agent
        bool exists;
    }

    struct Duel {
        uint256 id;
        uint256 agentA;
        uint256 agentB;
        string eventDescription;
        uint256 betDeadline;
        uint256 settleDeadline;
        uint256 totalPoolA;
        uint256 totalPoolB;
        uint256 winningAgent; // 0 until settled
        DuelState state;
    }

    mapping(uint256 => Agent) public agents;
    mapping(uint256 => Duel) public duels;
    mapping(uint256 => mapping(address => uint256)) public bets; // duelId => bettor => agentId
    mapping(uint256 => mapping(address => uint256)) public betAmounts; // duelId => bettor => amount
    mapping(uint256 => mapping(address => bool)) public claimed; // duelId => bettor => claimed

    event AgentCreated(uint256 indexed id, string name, address creator);
    event DuelCreated(
        uint256 indexed id,
        uint256 agentA,
        uint256 agentB,
        string eventDescription,
        uint256 betDeadline
    );
    event BetPlaced(uint256 indexed duelId, address indexed bettor, uint256 agentId, uint256 amount);
    event DuelSettled(uint256 indexed duelId, uint256 winner);
    event WinningsClaimed(uint256 indexed duelId, address indexed bettor, uint256 amount);
    event EmergencyRefund(uint256 indexed duelId);
    event Refunded(uint256 indexed duelId, address indexed bettor, uint256 amount);
    event FeesWithdrawn(address indexed to, uint256 amount);

    constructor(address _signalToken) Ownable(msg.sender) {
        require(_signalToken != address(0), "Invalid token address");
        signal = SignalToken(_signalToken);
    }

    // ─── Agent Management ───────────────────────────────────────

    /// @notice Anyone can create an agent. It becomes their agent in the arena.
    function createAgent(string calldata name, string calldata specialty) external returns (uint256) {
        require(bytes(name).length > 0 && bytes(name).length <= 32, "Invalid name length");

        agentCount++;
        agents[agentCount] = Agent({
            id: agentCount,
            creator: msg.sender,
            name: name,
            specialty: specialty,
            wins: 0,
            losses: 0,
            totalWagered: 0,
            exists: true
        });

        emit AgentCreated(agentCount, name, msg.sender);
        return agentCount;
    }

    // ─── Duel Management ────────────────────────────────────────

    /// @notice Create a duel between two agents.
    /// @param agentAId First agent
    /// @param agentBId Second agent
    /// @param eventDescription What they're predicting (e.g. "BTC price > $100k on May 15")
    /// @param betDurationSeconds How long betting stays open
    function createDuel(
        uint256 agentAId,
        uint256 agentBId,
        string calldata eventDescription,
        uint256 betDurationSeconds
    ) external returns (uint256) {
        require(agentAId != agentBId, "Agents must differ");
        require(agents[agentAId].exists && agents[agentBId].exists, "Agent not found");
        require(betDurationSeconds >= 1 hours && betDurationSeconds <= 30 days, "Invalid duration");

        duelCount++;
        duels[duelCount] = Duel({
            id: duelCount,
            agentA: agentAId,
            agentB: agentBId,
            eventDescription: eventDescription,
            betDeadline: block.timestamp + betDurationSeconds,
            settleDeadline: block.timestamp + betDurationSeconds + 14 days,
            totalPoolA: 0,
            totalPoolB: 0,
            winningAgent: 0,
            state: DuelState.Open
        });

        emit DuelCreated(duelCount, agentAId, agentBId, eventDescription, block.timestamp + betDurationSeconds);
        return duelCount;
    }

    // ─── Betting ─────────────────────────────────────────────────

    /// @notice Bet $SIGNAL on an agent in a duel. Requires prior approval of $SIGNAL.
    function bet(uint256 duelId, uint256 agentId, uint256 amount) external nonReentrant {
        Duel storage duel = duels[duelId];
        require(duel.state == DuelState.Open, "Betting closed");
        require(block.timestamp <= duel.betDeadline, "Deadline passed");
        require(agentId == duel.agentA || agentId == duel.agentB, "Invalid agent");
        require(amount > 0, "Amount must be > 0");
        require(bets[duelId][msg.sender] == 0, "Already bet on this duel");

        signal.transferFrom(msg.sender, address(this), amount);

        bets[duelId][msg.sender] = agentId;
        betAmounts[duelId][msg.sender] = amount;

        if (agentId == duel.agentA) {
            duel.totalPoolA += amount;
        } else {
            duel.totalPoolB += amount;
        }

        agents[agentId].totalWagered += amount;

        emit BetPlaced(duelId, msg.sender, agentId, amount);
    }

    // ─── Settlement ─────────────────────────────────────────────

    /// @notice Settle a duel by declaring the winner. Only owner (oracle) can call.
    function settle(uint256 duelId, uint256 winnerAgentId) external onlyOwner {
        Duel storage duel = duels[duelId];
        require(duel.state == DuelState.Open, "Must be open");
        require(block.timestamp >= duel.betDeadline, "Betting still open");
        require(block.timestamp <= duel.settleDeadline, "Settlement window expired");
        require(winnerAgentId == duel.agentA || winnerAgentId == duel.agentB, "Invalid winner");

        duel.winningAgent = winnerAgentId;
        duel.state = DuelState.Settled;
        accruedFees += _calculateArenaFee(duel.totalPoolA + duel.totalPoolB);

        // Update agent stats
        agents[winnerAgentId].wins++;
        uint256 loserId = winnerAgentId == duel.agentA ? duel.agentB : duel.agentA;
        agents[loserId].losses++;

        emit DuelSettled(duelId, winnerAgentId);
    }

    /// @notice Claim winnings after a duel is settled.
    function claimWinnings(uint256 duelId) external nonReentrant {
        Duel storage duel = duels[duelId];
        require(duel.state == DuelState.Settled, "Not settled");
        require(!claimed[duelId][msg.sender], "Already claimed");

        uint256 betAgent = bets[duelId][msg.sender];
        require(betAgent > 0, "No bet on this duel");

        uint256 payout;
        if (betAgent == duel.winningAgent) {
            payout = _calculatePayout(duelId, msg.sender);
        }
        // Losers get nothing. Your bet is gone.

        claimed[duelId][msg.sender] = true;

        if (payout > 0) {
            signal.transfer(msg.sender, payout);
            emit WinningsClaimed(duelId, msg.sender, payout);
        }
    }

    // ─── Internal ───────────────────────────────────────────────

    function _calculatePayout(uint256 duelId, address bettor) internal view returns (uint256) {
        Duel storage duel = duels[duelId];
        uint256 betAgent = bets[duelId][bettor];
        uint256 bettorAmount = betAmounts[duelId][bettor];
        uint256 winnerPool = betAgent == duel.agentA ? duel.totalPoolA : duel.totalPoolB;
        uint256 loserPool = betAgent == duel.agentA ? duel.totalPoolB : duel.totalPoolA;

        uint256 totalPot = winnerPool + loserPool;
        uint256 arenaFee = (totalPot * ARENA_CUT) / 10000;
        uint256 prizePool = totalPot - arenaFee;

        // Proportional payout: (your bet / total winner pool) * prize pool
        return (bettorAmount * prizePool) / winnerPool;
    }

    // ─── Emergency ──────────────────────────────────────────────

    /// @notice Anyone can unlock refunds if a duel expires without settlement.
    function emergencyRefund(uint256 duelId) external {
        Duel storage duel = duels[duelId];
        require(duel.state == DuelState.Open, "Must be open");
        require(block.timestamp > duel.settleDeadline, "Settle deadline not passed");

        duel.state = DuelState.Closed;

        emit EmergencyRefund(duelId);
    }

    /// @notice Claim your original bet back after an emergency refund closes a duel.
    function claimRefund(uint256 duelId) external nonReentrant {
        Duel storage duel = duels[duelId];
        require(duel.state == DuelState.Closed, "Refund not available");
        require(!claimed[duelId][msg.sender], "Already claimed");

        uint256 amount = betAmounts[duelId][msg.sender];
        require(amount > 0, "No bet on this duel");

        claimed[duelId][msg.sender] = true;
        signal.transfer(msg.sender, amount);

        emit Refunded(duelId, msg.sender, amount);
    }

    function _calculateArenaFee(uint256 totalPot) internal pure returns (uint256) {
        return (totalPot * ARENA_CUT) / 10000;
    }

    // ─── Admin ─────────────────────────────────────────────────

    /// @notice Withdraw accumulated arena fees to the owner
    function withdrawFees() external onlyOwner {
        uint256 fees = accruedFees;
        require(fees > 0, "No fees to withdraw");

        accruedFees = 0;
        signal.transfer(msg.sender, fees);

        emit FeesWithdrawn(msg.sender, fees);
    }
}
