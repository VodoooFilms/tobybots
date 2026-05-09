const hre = require("hardhat");

async function main() {
  const [owner] = await hre.ethers.getSigners();
  const SIGNAL = "0x7cfBB6a8b34F4E247bb4d82ec15463EB7c9A83A3";
  const ARENA = "0x0Ec0F1a5BaE2f6DC829D2f72ffB4d962C83b1EC1";

  const eth = () => hre.ethers.provider.getBalance(owner.address).then(b => hre.ethers.formatEther(b));
  console.log("Owner:", owner.address, "ETH:", await eth());

  const signal = await hre.ethers.getContractAt("SignalToken", SIGNAL);
  const arena = await hre.ethers.getContractAt("Arena", ARENA);

  const alice = new hre.ethers.Wallet("0x1111111111111111111111111111111111111111111111111111111111111111", hre.ethers.provider);
  const bob   = new hre.ethers.Wallet("0x2222222222222222222222222222222222222222222222222222222222222222", hre.ethers.provider);
  console.log("Alice:", alice.address, "\nBob:  ", bob.address);

  // Fund ETH (small amounts for gas only)
  let tx = await owner.sendTransaction({ to: alice.address, value: hre.ethers.parseEther("0.002") });
  await tx.wait();
  console.log("Alice +0.002 ETH");
  tx = await owner.sendTransaction({ to: bob.address, value: hre.ethers.parseEther("0.002") });
  await tx.wait();
  console.log("Bob   +0.002 ETH  | Owner:", await eth());

  // Fund $SIGNAL
  tx = await signal.transfer(alice.address, hre.ethers.parseEther("5000"));
  await tx.wait();
  console.log("Alice +5K $SIGNAL");
  tx = await signal.transfer(bob.address, hre.ethers.parseEther("5000"));
  await tx.wait();
  console.log("Bob   +5K $SIGNAL  | Owner:", await eth());

  // Duel #1: doomgpt vs bulltard, 7d
  console.log("\n--- Duel #1 ---");
  tx = await arena.createDuel(1, 2, "BTC supera los 100K en mayo 2026", 7 * 86400);
  await tx.wait();
  console.log("Duel #1: doomgpt(1) vs bulltard(2), 7d");

  tx = await signal.connect(alice).approve(ARENA, hre.ethers.parseEther("500"));
  await tx.wait();
  tx = await arena.connect(alice).bet(1, 1, hre.ethers.parseEther("500"));
  await tx.wait();
  console.log("Alice: 500 on doomgpt");

  tx = await signal.connect(bob).approve(ARENA, hre.ethers.parseEther("300"));
  await tx.wait();
  tx = await arena.connect(bob).bet(1, 2, hre.ethers.parseEther("300"));
  await tx.wait();
  console.log("Bob:   300 on bulltard  | Owner:", await eth());

  // Duel #2: weatherwiz vs doomgpt, 24h
  console.log("\n--- Duel #2 ---");
  tx = await arena.createDuel(3, 1, "Huracán cat 5 en el Atlántico antes de julio 2026", 86400);
  await tx.wait();
  console.log("Duel #2: weatherwiz(3) vs doomgpt(1), 24h");

  tx = await signal.connect(alice).approve(ARENA, hre.ethers.parseEther("200"));
  await tx.wait();
  tx = await arena.connect(alice).bet(2, 3, hre.ethers.parseEther("200"));
  await tx.wait();
  console.log("Alice: 200 on weatherwiz  | Owner:", await eth());

  // Verify
  const d1 = await arena.duels(1);
  const d2 = await arena.duels(2);
  console.log("\n=== LIVE ON SEPOLIA ===");
  console.log("Duel #1 Open:", hre.ethers.formatEther(d1.totalPoolA), "vs", hre.ethers.formatEther(d1.totalPoolB), "$SIGNAL");
  console.log("Duel #2 Open:", hre.ethers.formatEther(d2.totalPoolA), "vs", hre.ethers.formatEther(d2.totalPoolB), "$SIGNAL");
  console.log("Duel count:", (await arena.duelCount()).toString());
  console.log("\n✅ Ready for demo!");
}

main().catch(e => { console.error(e); process.exit(1); });
