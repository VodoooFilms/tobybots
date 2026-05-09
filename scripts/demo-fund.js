const hre = require("hardhat");

// Step 1: Fund demo wallets
async function main() {
  const [owner] = await hre.ethers.getSigners();
  const SIGNAL = "0x7cfBB6a8b34F4E247bb4d82ec15463EB7c9A83A3";

  // Demo wallets (same as before, pre-generated)
  const alice = new hre.ethers.Wallet("0x8a1f3b5c9d2e6f8a1b3c5d7e9f2a4b6c8d0e1f3a5b7c9d1e3f5a7b9c1d3e5f7", hre.ethers.provider);
  const bob   = new hre.ethers.Wallet("0xb2c4d6e8f0a1b3c5d7e9f1a3b5c7d9e1f3a5b7c9d1e3f5a7b9c1d3e5f7a9b", hre.ethers.provider);

  console.log("Owner ETH:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(owner.address)));

  // Fund with ETH
  const tx1 = await owner.sendTransaction({ to: alice.address, value: hre.ethers.parseEther("0.005") });
  await tx1.wait();
  console.log("Alice funded:", alice.address, "ETH:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(alice.address)));

  const tx2 = await owner.sendTransaction({ to: bob.address, value: hre.ethers.parseEther("0.005") });
  await tx2.wait();
  console.log("Bob funded:  ", bob.address, "ETH:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(bob.address)));

  // Fund with $SIGNAL
  const signal = await hre.ethers.getContractAt("SignalToken", SIGNAL);
  const sigAmount = hre.ethers.parseEther("10000");
  await (await signal.transfer(alice.address, sigAmount)).wait();
  console.log("Alice: 10K $SIGNAL");
  await (await signal.transfer(bob.address, sigAmount)).wait();
  console.log("Bob:   10K $SIGNAL");

  console.log("\n✅ Funding complete. Wallets ready for demo.");
}

main().catch(e => { console.error(e); process.exit(1); });
