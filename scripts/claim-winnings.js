const hre = require("hardhat");

async function main() {
  const ARENA = "0xB10FaBc2DFa536E4F0d853057e83663e91Bdd74B";
  const SIGNAL_ADDR = "0x7cfBB6a8b34F4E247bb4d82ec15463EB7c9A83A3";
  const OWNER = "0xC242829F7A7Fd6fe910738fe165ce5D19c1448FA";

  const arena = await hre.ethers.getContractAt("Arena", ARENA);
  const signal = await hre.ethers.getContractAt("SignalToken", SIGNAL_ADDR);

  const duelId = 1;
  const d = await arena.duels(duelId);

  console.log("Duelo #1:", d.eventDescription);
  console.log("Estado:", d.state === 2n ? "Settled ✅" : "No settleado");
  console.log("Ganador: agent #" + d.winningAgent.toString());

  const claimed = await arena.claimed(duelId, OWNER);
  if (claimed) {
    console.log("Ya reclamado.");
    return;
  }

  // Payout preview
  const betAmount = await arena.betAmounts(duelId, OWNER);
  console.log("Apostado:", hre.ethers.formatEther(betAmount), "SIGNAL");

  const totalPot = d.totalPoolA + d.totalPoolB;
  const arenaFee = (totalPot * 200n) / 10000n;
  const prizePool = totalPot - arenaFee;
  const payout = (betAmount * prizePool) / d.totalPoolA;
  console.log("Pool total:", hre.ethers.formatEther(totalPot), "SIGNAL");
  console.log("Fee Arena (2%):", hre.ethers.formatEther(arenaFee), "SIGNAL");
  console.log("Prize pool:", hre.ethers.formatEther(prizePool), "SIGNAL");
  console.log("Payout estimado:", hre.ethers.formatEther(payout), "SIGNAL");

  // Claim
  const before = await signal.balanceOf(OWNER);
  console.log("\nSIGNAL antes:", hre.ethers.formatEther(before));

  const tx = await arena.claimWinnings(duelId);
  const receipt = await tx.wait();
  console.log("TX:", receipt.hash);

  const after = await signal.balanceOf(OWNER);
  const gained = after - before;
  console.log("SIGNAL despues:", hre.ethers.formatEther(after));
  console.log("Ganancia neta:", hre.ethers.formatEther(gained), "SIGNAL 🎉");

  const arenaBal = await signal.balanceOf(ARENA);
  console.log("Arena escrow restante:", hre.ethers.formatEther(arenaBal), "SIGNAL");
}

main().catch(e => { console.error(e); process.exit(1); });
