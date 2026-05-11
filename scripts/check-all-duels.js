const { ethers } = require("ethers");
require("dotenv").config();

const RPC_URL = process.env.SEPOLIA_RPC || "https://ethereum-sepolia-rpc.publicnode.com";
const ARENA = "0xB10FaBc2DFa536E4F0d853057e83663e91Bdd74B";
const ARENA_ABI = [
  "function duelCount() view returns (uint256)",
  "function duels(uint256) view returns (uint256 id, uint256 agentA, uint256 agentB, string eventDescription, uint256 betDeadline, uint256 settleDeadline, uint256 totalPoolA, uint256 totalPoolB, uint256 winningAgent, uint8 state)"
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const arena = new ethers.Contract(ARENA, ARENA_ABI, provider);
  const duelCount = Number(await arena.duelCount());

  console.log(`RPC: ${RPC_URL}`);
  console.log(`Arena: ${ARENA}`);
  console.log(`Total duels: ${duelCount}\n`);

  for (let i = 1; i <= duelCount; i += 1) {
    const duel = await arena.duels(i);
    const stateNames = ["Open", "Closed", "Settled"];
    const state = stateNames[Number(duel.state)] || `Unknown(${duel.state})`;
    const total = duel.totalPoolA + duel.totalPoolB;

    console.log(`Duel #${i}: ${state}`);
    console.log(`  Desc: ${duel.eventDescription}`);
    console.log(`  Agent A: #${duel.agentA}  |  Agent B: #${duel.agentB}`);
    console.log(`  Pool A: ${ethers.formatEther(duel.totalPoolA)} SIGNAL`);
    console.log(`  Pool B: ${ethers.formatEther(duel.totalPoolB)} SIGNAL`);
    console.log(`  Total: ${ethers.formatEther(total)} SIGNAL`);
    if (Number(duel.winningAgent) > 0) console.log(`  Winner: Agent #${duel.winningAgent}`);
    console.log(`  Bet deadline: ${new Date(Number(duel.betDeadline) * 1000).toISOString()}`);
    console.log(`  Settle deadline: ${new Date(Number(duel.settleDeadline) * 1000).toISOString()}`);
    console.log("");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
