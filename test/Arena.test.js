const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SIGNAL Arena", function () {
  let signal, arena, owner, alice, bob, carol;

  beforeEach(async function () {
    [owner, alice, bob, carol] = await ethers.getSigners();

    const SignalToken = await ethers.getContractFactory("SignalToken");
    signal = await SignalToken.deploy(owner.address);
    await signal.waitForDeployment();

    const Arena = await ethers.getContractFactory("Arena");
    arena = await Arena.deploy(await signal.getAddress());
    await arena.waitForDeployment();

    await signal.setWhitelist(await arena.getAddress(), true);

    // Fund alice, bob & carol with $SIGNAL for betting
    await signal.transfer(alice.address, ethers.parseEther("10000"));
    await signal.transfer(bob.address, ethers.parseEther("10000"));
    await signal.transfer(carol.address, ethers.parseEther("10000"));
  });

  // ─── Agent Management ───────────────────────────────────────

  it("creates agents", async function () {
    await arena.createAgent("doomgpt", "crypto");
    const agent = await arena.agents(1);
    expect(agent.name).to.equal("doomgpt");
    expect(agent.creator).to.equal(owner.address);
  });

  // ─── Full Duel Flow ─────────────────────────────────────────

  it("full duel flow: create → bet → settle", async function () {
    await arena.createAgent("doomgpt", "crypto");
    await arena.createAgent("bulltard", "stocks");

    await arena.createDuel(1, 2, "BTC > 100k by June", 3600);
    const duel = await arena.duels(1);
    expect(duel.state).to.equal(0); // Open

    await signal.connect(alice).approve(await arena.getAddress(), ethers.parseEther("500"));
    await arena.connect(alice).bet(1, 1, ethers.parseEther("500"));
    await signal.connect(bob).approve(await arena.getAddress(), ethers.parseEther("300"));
    await arena.connect(bob).bet(1, 2, ethers.parseEther("300"));

    const duelAfter = await arena.duels(1);
    expect(duelAfter.totalPoolA).to.equal(ethers.parseEther("500"));
    expect(duelAfter.totalPoolB).to.equal(ethers.parseEther("300"));

    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine");

    await arena.settle(1, 1);
    const settled = await arena.duels(1);
    expect(settled.state).to.equal(2); // Settled
    expect(settled.winningAgent).to.equal(1n);
  });

  // ─── Claim Winnings ─────────────────────────────────────────

  it("claimWinnings: winner gets proportional payout", async function () {
    await arena.createAgent("doomgpt", "crypto");
    await arena.createAgent("bulltard", "stocks");
    await arena.createDuel(1, 2, "ETH > 5k", 3600);

    // Alice bets 500 on agent 1, Bob bets 300 on agent 2
    await signal.connect(alice).approve(await arena.getAddress(), ethers.parseEther("500"));
    await arena.connect(alice).bet(1, 1, ethers.parseEther("500"));
    await signal.connect(bob).approve(await arena.getAddress(), ethers.parseEther("300"));
    await arena.connect(bob).bet(1, 2, ethers.parseEther("300"));

    // Fast forward + settle: agent 1 wins
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine");
    await arena.settle(1, 1);

    // Payout math: totalPot=800, arenaFee=16 (2%), prizePool=784
    // Alice gets: (500 * 784) / 500 = 784
    const expectedPayout = ethers.parseEther("784");

    const balanceBefore = await signal.balanceOf(alice.address);
    await arena.connect(alice).claimWinnings(1);
    const balanceAfter = await signal.balanceOf(alice.address);

    expect(balanceAfter - balanceBefore).to.equal(expectedPayout);
  });

  it("claimWinnings: loser gets nothing", async function () {
    await arena.createAgent("doomgpt", "crypto");
    await arena.createAgent("bulltard", "stocks");
    await arena.createDuel(1, 2, "SOL > 500", 3600);

    await signal.connect(alice).approve(await arena.getAddress(), ethers.parseEther("200"));
    await arena.connect(alice).bet(1, 1, ethers.parseEther("200"));
    await signal.connect(bob).approve(await arena.getAddress(), ethers.parseEther("200"));
    await arena.connect(bob).bet(1, 2, ethers.parseEther("200"));

    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine");
    await arena.settle(1, 1); // agent 1 wins, bob bet on agent 2

    const balanceBefore = await signal.balanceOf(bob.address);
    await arena.connect(bob).claimWinnings(1);
    const balanceAfter = await signal.balanceOf(bob.address);

    // Bob gets nothing — just gas cost difference
    expect(balanceAfter).to.equal(balanceBefore);
    // But claimed is marked true
    expect(await arena.claimed(1, bob.address)).to.equal(true);
  });

  it("claimWinnings: cannot claim twice", async function () {
    await arena.createAgent("doomgpt", "crypto");
    await arena.createAgent("bulltard", "stocks");
    await arena.createDuel(1, 2, "Test", 3600);

    await signal.connect(alice).approve(await arena.getAddress(), ethers.parseEther("100"));
    await arena.connect(alice).bet(1, 1, ethers.parseEther("100"));

    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine");
    await arena.settle(1, 1);

    await arena.connect(alice).claimWinnings(1);
    await expect(
      arena.connect(alice).claimWinnings(1)
    ).to.be.revertedWith("Already claimed");
  });

  // ─── Emergency Refund ───────────────────────────────────────

  it("emergencyRefund: closes duel and lets bettors claim refunds", async function () {
    await arena.createAgent("doomgpt", "crypto");
    await arena.createAgent("bulltard", "stocks");
    await arena.createDuel(1, 2, "Expired duel", 3600);

    await signal.connect(alice).approve(await arena.getAddress(), ethers.parseEther("500"));
    await arena.connect(alice).bet(1, 1, ethers.parseEther("500"));
    await signal.connect(bob).approve(await arena.getAddress(), ethers.parseEther("300"));
    await arena.connect(bob).bet(1, 2, ethers.parseEther("300"));

    // Fast forward past settleDeadline (betDeadline + 14 days)
    await ethers.provider.send("evm_increaseTime", [3601 + 14 * 86400]);
    await ethers.provider.send("evm_mine");

    const aliceBefore = await signal.balanceOf(alice.address);
    const bobBefore = await signal.balanceOf(bob.address);

    await arena.emergencyRefund(1);

    await arena.connect(alice).claimRefund(1);
    await arena.connect(bob).claimRefund(1);

    const aliceAfter = await signal.balanceOf(alice.address);
    const bobAfter = await signal.balanceOf(bob.address);

    expect(aliceAfter - aliceBefore).to.equal(ethers.parseEther("500"));
    expect(bobAfter - bobBefore).to.equal(ethers.parseEther("300"));

    // Duel state is Closed (1), not Settled
    const duel = await arena.duels(1);
    expect(duel.state).to.equal(1); // Closed
  });

  it("claimRefund: only available after emergency refund", async function () {
    await arena.createAgent("doomgpt", "crypto");
    await arena.createAgent("bulltard", "stocks");
    await arena.createDuel(1, 2, "Refund gate", 3600);

    await signal.connect(alice).approve(await arena.getAddress(), ethers.parseEther("100"));
    await arena.connect(alice).bet(1, 1, ethers.parseEther("100"));

    await expect(
      arena.connect(alice).claimRefund(1)
    ).to.be.revertedWith("Refund not available");
  });

  it("claimRefund: cannot claim twice", async function () {
    await arena.createAgent("doomgpt", "crypto");
    await arena.createAgent("bulltard", "stocks");
    await arena.createDuel(1, 2, "Refund once", 3600);

    await signal.connect(alice).approve(await arena.getAddress(), ethers.parseEther("100"));
    await arena.connect(alice).bet(1, 1, ethers.parseEther("100"));

    await ethers.provider.send("evm_increaseTime", [3601 + 14 * 86400]);
    await ethers.provider.send("evm_mine");
    await arena.emergencyRefund(1);

    await arena.connect(alice).claimRefund(1);
    await expect(
      arena.connect(alice).claimRefund(1)
    ).to.be.revertedWith("Already claimed");
  });

  it("emergencyRefund: anyone can unlock refunds after settleDeadline", async function () {
    await arena.createAgent("doomgpt", "crypto");
    await arena.createAgent("bulltard", "stocks");
    await arena.createDuel(1, 2, "Test", 3600);

    await ethers.provider.send("evm_increaseTime", [3601 + 14 * 86400]);
    await ethers.provider.send("evm_mine");

    await expect(
      arena.connect(alice).emergencyRefund(1)
    ).to.not.be.reverted;

    const duel = await arena.duels(1);
    expect(duel.state).to.equal(1); // Closed
  });

  it("emergencyRefund: only after settleDeadline", async function () {
    await arena.createAgent("doomgpt", "crypto");
    await arena.createAgent("bulltard", "stocks");
    await arena.createDuel(1, 2, "Test", 3600);

    // Before settleDeadline — should revert
    await ethers.provider.send("evm_increaseTime", [3601]); // past betDeadline but not settleDeadline
    await ethers.provider.send("evm_mine");

    await expect(
      arena.emergencyRefund(1)
    ).to.be.revertedWith("Settle deadline not passed");
  });

  // ─── Settle deadline enforcement ────────────────────────────

  it("settle: reverts after settleDeadline", async function () {
    await arena.createAgent("doomgpt", "crypto");
    await arena.createAgent("bulltard", "stocks");
    await arena.createDuel(1, 2, "Expired settlement", 3600);

    // Fast forward past settleDeadline
    await ethers.provider.send("evm_increaseTime", [3601 + 14 * 86400 + 1]);
    await ethers.provider.send("evm_mine");

    await expect(
      arena.settle(1, 1)
    ).to.be.revertedWith("Settlement window expired");
  });

  // ─── Withdraw Fees ──────────────────────────────────────────

  it("withdrawFees: owner can withdraw only accrued fees", async function () {
    await arena.createAgent("doomgpt", "crypto");
    await arena.createAgent("bulltard", "stocks");
    await arena.createDuel(1, 2, "Fee test", 3600);

    await signal.connect(alice).approve(await arena.getAddress(), ethers.parseEther("500"));
    await arena.connect(alice).bet(1, 1, ethers.parseEther("500"));
    await signal.connect(bob).approve(await arena.getAddress(), ethers.parseEther("500"));
    await arena.connect(bob).bet(1, 2, ethers.parseEther("500"));

    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine");
    await arena.settle(1, 1);

    // Alice claims her winnings first
    await arena.connect(alice).claimWinnings(1);

    // Arena should hold the 2% fee: 1000 * 0.02 = 20 $SIGNAL
    // (v1 withdrawFees pulls full contract balance, which after claims = fees only)
    const arenaBalance = await signal.balanceOf(await arena.getAddress());
    expect(arenaBalance).to.be.gt(0);

    const ownerBefore = await signal.balanceOf(owner.address);
    await arena.withdrawFees();
    const ownerAfter = await signal.balanceOf(owner.address);

    expect(ownerAfter - ownerBefore).to.equal(ethers.parseEther("20"));
    expect(await signal.balanceOf(await arena.getAddress())).to.equal(
      arenaBalance - ethers.parseEther("20")
    );
    expect(await arena.accruedFees()).to.equal(0);
  });

  it("withdrawFees: does not drain open-duel escrow", async function () {
    await arena.createAgent("doomgpt", "crypto");
    await arena.createAgent("bulltard", "stocks");
    await arena.createDuel(1, 2, "Open escrow", 3600);

    await signal.connect(alice).approve(await arena.getAddress(), ethers.parseEther("200"));
    await arena.connect(alice).bet(1, 1, ethers.parseEther("200"));

    await expect(
      arena.withdrawFees()
    ).to.be.revertedWith("No fees to withdraw");

    expect(await signal.balanceOf(await arena.getAddress())).to.equal(ethers.parseEther("200"));
  });

  it("withdrawFees: winner can still claim after owner withdraws fees", async function () {
    await arena.createAgent("doomgpt", "crypto");
    await arena.createAgent("bulltard", "stocks");
    await arena.createDuel(1, 2, "Winner claim survives fee withdrawal", 3600);

    await signal.connect(alice).approve(await arena.getAddress(), ethers.parseEther("500"));
    await arena.connect(alice).bet(1, 1, ethers.parseEther("500"));
    await signal.connect(bob).approve(await arena.getAddress(), ethers.parseEther("500"));
    await arena.connect(bob).bet(1, 2, ethers.parseEther("500"));

    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine");
    await arena.settle(1, 1);

    await arena.withdrawFees();

    const balanceBefore = await signal.balanceOf(alice.address);
    await arena.connect(alice).claimWinnings(1);
    const balanceAfter = await signal.balanceOf(alice.address);

    expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("980"));
  });

  // ─── Edge Cases: Bet Restrictions ───────────────────────────

  it("bet: reverts after deadline", async function () {
    await arena.createAgent("doomgpt", "crypto");
    await arena.createAgent("bulltard", "stocks");
    await arena.createDuel(1, 2, "Late bet", 3600);

    await signal.connect(alice).approve(await arena.getAddress(), ethers.parseEther("100"));

    // Fast forward past betDeadline
    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine");

    await expect(
      arena.connect(alice).bet(1, 1, ethers.parseEther("100"))
    ).to.be.revertedWith("Deadline passed");
  });

  it("bet: reverts on closed duel", async function () {
    await arena.createAgent("doomgpt", "crypto");
    await arena.createAgent("bulltard", "stocks");
    await arena.createDuel(1, 2, "Closed duel", 3600);

    // Expire and emergency refund → state becomes Closed
    await ethers.provider.send("evm_increaseTime", [3601 + 14 * 86400]);
    await ethers.provider.send("evm_mine");
    await arena.emergencyRefund(1);

    await signal.connect(alice).approve(await arena.getAddress(), ethers.parseEther("100"));
    await expect(
      arena.connect(alice).bet(1, 1, ethers.parseEther("100"))
    ).to.be.revertedWith("Betting closed");
  });

  it("bet: reverts on settled duel", async function () {
    await arena.createAgent("doomgpt", "crypto");
    await arena.createAgent("bulltard", "stocks");
    await arena.createDuel(1, 2, "Settled duel", 3600);

    await ethers.provider.send("evm_increaseTime", [3601]);
    await ethers.provider.send("evm_mine");
    await arena.settle(1, 1);

    await signal.connect(alice).approve(await arena.getAddress(), ethers.parseEther("100"));
    await expect(
      arena.connect(alice).bet(1, 1, ethers.parseEther("100"))
    ).to.be.revertedWith("Betting closed");
  });

  it("bet: reverts on invalid agent", async function () {
    await arena.createAgent("doomgpt", "crypto");
    await arena.createAgent("bulltard", "stocks");
    await arena.createDuel(1, 2, "Wrong agent", 3600);

    await signal.connect(alice).approve(await arena.getAddress(), ethers.parseEther("100"));
    await expect(
      arena.connect(alice).bet(1, 99, ethers.parseEther("100"))
    ).to.be.revertedWith("Invalid agent");
  });

  // ─── Edge Cases: Agent & Duel Creation ──────────────────────

  it("createAgent: reverts on name too long", async function () {
    const longName = "A".repeat(33);
    await expect(
      arena.createAgent(longName, "crypto")
    ).to.be.revertedWith("Invalid name length");
  });

  it("createDuel: reverts on same agent", async function () {
    await arena.createAgent("doomgpt", "crypto");
    await expect(
      arena.createDuel(1, 1, "Self-duel", 3600)
    ).to.be.revertedWith("Agents must differ");
  });

  it("createDuel: reverts on non-existent agent", async function () {
    await arena.createAgent("doomgpt", "crypto");
    await expect(
      arena.createDuel(1, 99, "Ghost agent", 3600)
    ).to.be.revertedWith("Agent not found");
  });
});
