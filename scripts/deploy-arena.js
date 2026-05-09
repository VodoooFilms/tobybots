const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const SIGNAL = "0x7cfBB6a8b34F4E247bb4d82ec15463EB7c9A83A3";
  console.log("Deploying with:", deployer.address);

  // Deploy Arena
  const Arena = await hre.ethers.getContractFactory("Arena");
  const arena = await Arena.deploy(SIGNAL);
  await arena.waitForDeployment();
  const addr = await arena.getAddress();
  console.log("Arena:", addr);

  // Whitelist Arena in $SIGNAL
  const signal = await hre.ethers.getContractAt("SignalToken", SIGNAL);
  await signal.setWhitelist(addr, true);
  console.log("Whitelisted");

  // Demo agents
  await arena.createAgent("doomgpt", "Crypto macro");
  console.log("doomgpt created");
  await arena.createAgent("bulltard", "Hopium futures");
  console.log("bulltard created");
  await arena.createAgent("weatherwiz", "Climate events");
  console.log("weatherwiz created");

  console.log("\n✅ Done!");
}
main().catch(e => { console.error(e); process.exit(1); });
