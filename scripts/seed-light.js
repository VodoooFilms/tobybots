const hre = require("hardhat");

async function main() {
  const [owner] = await hre.ethers.getSigners();
  const SIGNAL = "0x7cfBB6a8b34F4E247bb4d82ec15463EB7c9A83A3";
  const ARENA  = "0xB10FaBc2DFa536E4F0d853057e83663e91Bdd74B";

  const fmt = (n) => hre.ethers.formatEther(n);
  const toWei = (n) => hre.ethers.parseEther(String(n));

  const signal = await hre.ethers.getContractAt("SignalToken", SIGNAL);
  const arena  = await hre.ethers.getContractAt("Arena", ARENA);

  console.log("Owner:", owner.address, "| ETH:", fmt(await hre.ethers.provider.getBalance(owner.address)));

  // Create temp bettor wallet
  const bettor = hre.ethers.Wallet.createRandom().connect(hre.ethers.provider);
  console.log("Bettor:", bettor.address);

  // Fund bettor with minimal ETH for gas
  const txEth = await owner.sendTransaction({ to: bettor.address, value: toWei(0.002) });
  await txEth.wait();

  // Transfer 50 SIGNAL to bettor
  const txSig = await signal.transfer(bettor.address, toWei(50));
  await txSig.wait();

  // Create duel: doomgpt(1) vs bulltard(2), 1h betting window
  const txDuel = await arena.createDuel(1, 2, "BTC cierra mayo 2026 arriba de $100K", 3600);
  await txDuel.wait();
  const duelId = await arena.duelCount();
  console.log("Duel #" + duelId + " creado: doomgpt vs bulltard (1h ventana)");

  // Owner bets 25 SIGNAL on doomgpt
  const txApprove1 = await signal.approve(ARENA, toWei(25));
  await txApprove1.wait();
  const txBet1 = await arena.bet(duelId, 1, toWei(25));
  await txBet1.wait();
  console.log("Owner apostó 25 SIGNAL en doomgpt");

  // Bettor bets 25 SIGNAL on bulltard
  const txApprove2 = await signal.connect(bettor).approve(ARENA, toWei(25));
  await txApprove2.wait();
  const txBet2 = await arena.connect(bettor).bet(duelId, 2, toWei(25));
  await txBet2.wait();
  console.log("Bettor apostó 25 SIGNAL en bulltard");

  // Verify
  const duel = await arena.duels(duelId);
  console.log("\n=== LIVE ===");
  console.log("Duel #" + duelId + ": " + duel.eventDescription);
  console.log("Pool A (doomgpt):", fmt(duel.totalPoolA), "SIGNAL");
  console.log("Pool B (bulltard):", fmt(duel.totalPoolB), "SIGNAL");
  console.log("Total pot:", fmt(duel.totalPoolA + duel.totalPoolB), "SIGNAL");
  console.log("Estado:", duel.state === 0n ? "Open" : duel.state === 1n ? "Closed" : "Settled");
  console.log("Bet deadline:", new Date(Number(duel.betDeadline) * 1000).toLocaleString());
  console.log("\nOwner ETH:", fmt(await hre.ethers.provider.getBalance(owner.address)));
  console.log("Owner SIGNAL:", fmt(await signal.balanceOf(owner.address)));
  console.log("Bettor SIGNAL:", fmt(await signal.balanceOf(bettor.address)));
  console.log("\nPara settle: espera 1h, luego npx hardhat run scripts/seed-settle.js --network sepolia");
}

main().catch(e => { console.error(e); process.exit(1); });
