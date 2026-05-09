const hre = require("hardhat");

async function main() {
  const SIGNAL = "0x7cfBB6a8b34F4E247bb4d82ec15463EB7c9A83A3";
  const ARENA = "0x0Ec0F1a5BaE2f6DC829D2f72ffB4d962C83b1EC1";
  const OWNER = "0xC242829F7A7Fd6fe910738fe165ce5D19c1448FA";

  const provider = hre.ethers.provider;

  // ETH balance
  const ethBal = await provider.getBalance(OWNER);
  console.log("ETH balance:", hre.ethers.formatEther(ethBal));

  // $SIGNAL
  const signal = await hre.ethers.getContractAt("SignalToken", SIGNAL);
  console.log("\n=== $SIGNAL ===");
  console.log("Address:", SIGNAL);
  console.log("Name:", await signal.name());
  console.log("Symbol:", await signal.symbol());
  console.log("Total Supply:", hre.ethers.formatEther(await signal.totalSupply()));
  console.log("Owner:", await signal.owner());
  console.log("Fee Collector:", await signal.feeCollector());
  console.log("Arena whitelisted:", await signal.whitelist(ARENA));
  const sigCode = await provider.getCode(SIGNAL);
  console.log("Bytecode deployed:", sigCode !== "0x");

  // Arena
  const arena = await hre.ethers.getContractAt("Arena", ARENA);
  console.log("\n=== Arena ===");
  console.log("Address:", ARENA);
  console.log("Owner:", await arena.owner());
  console.log("signal() =>", await arena.signal());
  console.log("duelCount:", (await arena.duelCount()).toString());
  console.log("agentCount:", (await arena.agentCount()).toString());
  console.log("ARENA_CUT:", (await arena.ARENA_CUT()).toString());

  // Agents
  const agentCount = Number(await arena.agentCount());
  for (let i = 1; i <= agentCount; i++) {
    const agent = await arena.agents(i);
    console.log(`  Agent #${i}: ${agent.name} (${agent.specialty}) — creator: ${agent.creator} — exists: ${agent.exists} — W/L: ${agent.wins}/${agent.losses}`);
  }

  const arenaCode = await provider.getCode(ARENA);
  console.log("Bytecode deployed:", arenaCode !== "0x");

  // Token balance of Arena
  const arenaBal = await signal.balanceOf(ARENA);
  console.log("\nArena $SIGNAL balance:", hre.ethers.formatEther(arenaBal));

  console.log("\n✅ Verification complete");
}

main().catch(e => { console.error(e); process.exit(1); });
