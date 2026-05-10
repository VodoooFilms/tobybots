const hre = require("hardhat");

async function main() {
  const ARENA = "0xB10FaBc2DFa536E4F0d853057e83663e91Bdd74B";
  const arena = await hre.ethers.getContractAt("Arena", ARENA);

  const duelId = 1;
  const duel = await arena.duels(duelId);
  const now = Math.floor(Date.now() / 1000);

  console.log("Duel #1:", duel.eventDescription);
  console.log("Bet deadline:", new Date(Number(duel.betDeadline) * 1000).toLocaleString());
  console.log("Ahora:", new Date(now * 1000).toLocaleString());

  if (now < Number(duel.betDeadline)) {
    const remaining = Number(duel.betDeadline) - now;
    console.log("Faltan", Math.ceil(remaining / 60), "minutos para el cierre de apuestas.");
    return;
  }

  if (duel.state !== 0n) {
    console.log("Estado actual:", duel.state === 1n ? "Closed" : "Settled");
    return;
  }

  // Settle: doomgpt wins (agentId 1)
  const tx = await arena.settle(duelId, 1);
  await tx.wait();
  console.log("Settled! Ganador: doomgpt (agent #1)");

  // Show payouts
  const d = await arena.duels(duelId);
  console.log("\nPool final:", hre.ethers.formatEther(d.totalPoolA + d.totalPoolB), "SIGNAL");
  console.log("Arena fee (2%):", hre.ethers.formatEther((d.totalPoolA + d.totalPoolB) * 200n / 10000n), "SIGNAL");
  console.log("Ganancia del owner:", hre.ethers.formatEther((d.totalPoolA + d.totalPoolB) * 9800n / 10000n), "SIGNAL");
  console.log("\nAhora cobrá tus ganancias desde la UI (claimWinnings) o:");
  console.log("  npx hardhat run scripts/seed-claim.js --network sepolia");
}

main().catch(e => { console.error(e); process.exit(1); });
