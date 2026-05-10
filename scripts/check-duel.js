const hre = require("hardhat");

async function main() {
  const ARENA = "0xB10FaBc2DFa536E4F0d853057e83663e91Bdd74B";
  const arena = await hre.ethers.getContractAt("Arena", ARENA);
  const d = await arena.duels(1);

  console.log("Estado:", d.state.toString(), d.state === 0n ? "(Open)" : d.state === 1n ? "(Closed)" : "(Settled)");
  console.log("Ganador (agentId):", d.winningAgent.toString());
  console.log("Descripción:", d.eventDescription);
  console.log("Pool A (doomgpt):", hre.ethers.formatEther(d.totalPoolA), "SIGNAL");
  console.log("Pool B (bulltard):", hre.ethers.formatEther(d.totalPoolB), "SIGNAL");

  const signalAddr = await arena.signal();
  const signal = await hre.ethers.getContractAt("SignalToken", signalAddr);

  for (let i = 1; i <= 3; i++) {
    const a = await arena.agents(i);
    console.log("Agent #" + i + ":", a.name, "W/L:", a.wins.toString() + "/" + a.losses.toString());
  }

  const arenaBal = await signal.balanceOf(ARENA);
  console.log("Arena SIGNAL balance:", hre.ethers.formatEther(arenaBal));

  const owner = "0xC242829F7A7Fd6fe910738fe165ce5D19c1448FA";
  const bettor = "0x328818A2A5680f28589A9107BbEb57B93E2dA884";
  console.log("Owner SIGNAL:", hre.ethers.formatEther(await signal.balanceOf(owner)));
  console.log("Bettor SIGNAL:", hre.ethers.formatEther(await signal.balanceOf(bettor)));
  console.log("Owner ETH:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(owner)));
}

main().catch(e => { console.error(e); process.exit(1); });
