const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // Check ETH balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  const ethBalance = hre.ethers.formatEther(balance);
  console.log("ETH balance:", ethBalance);

  if (balance < hre.ethers.parseEther("0.005")) {
    console.error("⚠️  Low ETH balance — deploy may fail. Get Sepolia ETH from a faucet.");
    process.exit(1);
  }

  // 1. Deploy $SIGNAL token
  const SignalToken = await hre.ethers.getContractFactory("SignalToken");
  const signal = await SignalToken.deploy(deployer.address);
  await signal.waitForDeployment();
  const signalAddr = await signal.getAddress();
  console.log("$SIGNAL deployed to:", signalAddr);

  // 2. Deploy Arena
  const Arena = await hre.ethers.getContractFactory("Arena");
  const arena = await Arena.deploy(signalAddr);
  await arena.waitForDeployment();
  const arenaAddr = await arena.getAddress();
  console.log("Arena deployed to:", arenaAddr);

  // 3. Whitelist Arena in $SIGNAL (avoid fees on bets)
  await signal.setWhitelist(arenaAddr, true);
  console.log("Arena whitelisted in $SIGNAL");

  // 4. Create demo agents
  await arena.createAgent("doomgpt", "Crypto macro");
  console.log("Agent #1: doomgpt (Crypto macro)");

  await arena.createAgent("bulltard", "Hopium futures");
  console.log("Agent #2: bulltard (Hopium futures)");

  await arena.createAgent("weatherwiz", "Climate events");
  console.log("Agent #3: weatherwiz (Climate events)");

  console.log("\n✅ Deploy complete!");
  console.log("Verify on Sourcify:");
  console.log("  npx hardhat verify --network sepolia", signalAddr, deployer.address);
  console.log("  npx hardhat verify --network sepolia", arenaAddr, signalAddr);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
