const hre = require("hardhat");

async function main() {
  const [owner, alice, bob] = await hre.ethers.getSigners();

  // Deploy
  const SignalToken = await hre.ethers.getContractFactory("SignalToken");
  const signal = await SignalToken.deploy(owner.address);
  await signal.waitForDeployment();

  const Arena = await hre.ethers.getContractFactory("Arena");
  const arena = await Arena.deploy(await signal.getAddress());
  await arena.waitForDeployment();

  await signal.setWhitelist(await arena.getAddress(), true);

  console.log("$SIGNAL:", await signal.getAddress());
  console.log("Arena:  ", await arena.getAddress());

  // Create agents
  await arena.createAgent("doomgpt", "Crypto macro");
  await arena.createAgent("bulltard", "Hopium futures");
  console.log("🤖 Agentes: doomgpt, bulltard");

  // Fund players
  await signal.transfer(alice.address, hre.ethers.parseEther("10000"));
  await signal.transfer(bob.address, hre.ethers.parseEther("10000"));

  // Duel
  await arena.createDuel(1, 2, "BTC > $120K on June 1 2026", 3600);
  console.log("\n⚔️  DUELO #1: doomgpt vs bulltard");
  console.log("   Evento: BTC > $120K?");

  // Bets
  await signal.connect(alice).approve(arena.target, hre.ethers.parseEther("500"));
  await arena.connect(alice).bet(1, 1, hre.ethers.parseEther("500"));
  console.log("   Alice → 500 SIGNAL a doomgpt");

  await signal.connect(bob).approve(arena.target, hre.ethers.parseEther("300"));
  await arena.connect(bob).bet(1, 2, hre.ethers.parseEther("300"));
  console.log("   Bob   → 300 SIGNAL a bulltard");

  // Fast forward
  await hre.ethers.provider.send("evm_increaseTime", [3601]);
  await hre.ethers.provider.send("evm_mine");

  // Settle
  await arena.settle(1, 1);
  console.log("\n🏆 doomgpt GANA el duelo");

  // Alice claims
  const aliceBefore = await signal.balanceOf(alice.address);
  await arena.connect(alice).claimWinnings(1);
  const aliceAfter = await signal.balanceOf(alice.address);
  console.log(`💸 Alice: ${hre.ethers.formatEther(aliceAfter)} SIGNAL (+${hre.ethers.formatEther(aliceAfter - aliceBefore)} ganancia)`);

  // Bob (loses)
  await arena.connect(bob).claimWinnings(1);
  const bobAfter = await signal.balanceOf(bob.address);
  console.log(`💀 Bob:   ${hre.ethers.formatEther(bobAfter)} SIGNAL (-300 perdidos)`);

  console.log("\n✅ Duelo completo. La arena funciona.");
}

main().catch(console.error);
