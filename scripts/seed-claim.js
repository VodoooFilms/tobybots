const hre = require("hardhat");

async function main() {
  const ARENA = "0xB10FaBc2DFa536E4F0d853057e83663e91Bdd74B";
  const arena = await hre.ethers.getContractAt("Arena", ARENA);
  const [owner] = await hre.ethers.getSigners();

  const duel = await arena.duels(1);
  console.log("Duel #1:", duel.eventDescription);
  console.log("Estado:", duel.state === 0n ? "Open" : duel.state === 1n ? "Closed" : "Settled");

  if (duel.state !== 2n) {
    console.log("El duelo no está settled todavía. Corré seed-settle.js primero.");
    return;
  }

  const claimed = await arena.claimed(1, owner.address);
  if (claimed) {
    console.log("Ya cobraste este duelo.");
    return;
  }

  const betAmount = await arena.betAmounts(1, owner.address);
  if (betAmount === 0n) {
    console.log("No tenés apuesta en este duelo.");
    return;
  }

  console.log("Cobrando ganancia...");
  const tx = await arena.claimWinnings(1);
  await tx.wait();
  console.log("Ganancia cobrada!");

  // Show result
  const d = await arena.duels(1);
  console.log("\nPool:", hre.ethers.formatEther(d.totalPoolA + d.totalPoolB), "SIGNAL");
  console.log("Ganador: agent #" + d.winningAgent);
}

main().catch(e => { console.error(e); process.exit(1); });
