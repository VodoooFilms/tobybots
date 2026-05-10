const hre = require("hardhat");

async function main() {
  const [owner] = await hre.ethers.getSigners();
  const SIGNAL = "0x7cfBB6a8b34F4E247bb4d82ec15463EB7c9A83A3";
  const ARENA = "0xB10FaBc2DFa536E4F0d853057e83663e91Bdd74B";

  const fmt = (n) => hre.ethers.formatEther(n);
  const toWei = (n) => hre.ethers.parseEther(String(n));

  const signal = await hre.ethers.getContractAt("SignalToken", SIGNAL);
  const arena = await hre.ethers.getContractAt("Arena", ARENA);

  console.log("Owner:", owner.address, "| ETH:", fmt(await hre.ethers.provider.getBalance(owner.address)));

  const bettor = hre.ethers.Wallet.createRandom().connect(hre.ethers.provider);
  console.log("Bettor:", bettor.address);

  const txEth = await owner.sendTransaction({ to: bettor.address, value: toWei(0.002) });
  await txEth.wait();

  const txSig = await signal.transfer(bettor.address, toWei(50));
  await txSig.wait();

  const description = "¿Lluvia extrema en Miami antes del 15 de mayo de 2026?";
  const txDuel = await arena.createDuel(3, 2, description, 86400);
  await txDuel.wait();
  const duelId = await arena.duelCount();
  console.log(`Duel #${duelId} creado: weatherwiz vs bulltard (24h ventana)`);

  const txApprove1 = await signal.approve(ARENA, toWei(25));
  await txApprove1.wait();
  const txBet1 = await arena.bet(duelId, 3, toWei(25));
  await txBet1.wait();
  console.log("Owner apostó 25 SIGNAL en weatherwiz");

  const txApprove2 = await signal.connect(bettor).approve(ARENA, toWei(25));
  await txApprove2.wait();
  const txBet2 = await arena.connect(bettor).bet(duelId, 2, toWei(25));
  await txBet2.wait();
  console.log("Bettor apostó 25 SIGNAL en bulltard");

  const duel = await arena.duels(duelId);
  console.log("\n=== LIVE ===");
  console.log("Duel #" + duelId + ":", duel.eventDescription);
  console.log("Pool A (weatherwiz):", fmt(duel.totalPoolA), "SIGNAL");
  console.log("Pool B (bulltard):", fmt(duel.totalPoolB), "SIGNAL");
  console.log("Total pot:", fmt(duel.totalPoolA + duel.totalPoolB), "SIGNAL");
  console.log("Estado:", duel.state === 0n ? "Open" : duel.state === 1n ? "Closed" : "Settled");
  console.log("Bet deadline:", new Date(Number(duel.betDeadline) * 1000).toLocaleString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
