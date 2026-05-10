const hre = require("hardhat");

async function main() {
  const arena = await hre.ethers.getContractAt(
    "Arena",
    "0xB10FaBc2DFa536E4F0d853057e83663e91Bdd74B"
  );
  const duelCount = Number(await arena.duelCount());
  console.log(`Total duels: ${duelCount}\n`);

  for (let i = 1; i <= duelCount; i++) {
    const d = await arena.duels(i);
    const stateNames = ["Open", "Closed", "Settled"];
    const state = stateNames[d.state] || `Unknown(${d.state})`;
    const betDeadline = new Date(Number(d.betDeadline) * 1000).toISOString();
    const settleDeadline = new Date(Number(d.settleDeadline) * 1000).toISOString();
    console.log(`Duel #${i}: ${state}`);
    console.log(`  Desc: ${d.eventDescription}`);
    console.log(`  Agent A: #${d.agentA}  |  Agent B: #${d.agentB}`);
    console.log(`  Pool A: ${hre.ethers.formatUnits(d.totalPoolA, 18)} SIGNAL`);
    console.log(`  Pool B: ${hre.ethers.formatUnits(d.totalPoolB, 18)} SIGNAL`);
    console.log(`  Total: ${hre.ethers.formatUnits(d.totalPoolA + d.totalPoolB, 18)} SIGNAL`);
    if (Number(d.winningAgent) > 0) console.log(`  Winner: Agent #${d.winningAgent}`);
    console.log(`  Bet deadline: ${betDeadline}`);
    console.log(`  Settle deadline: ${settleDeadline}`);
    console.log("");
  }
}

main().catch(console.error);
