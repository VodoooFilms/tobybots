const hre = require("hardhat");

const SIGNAL = "0x7cfBB6a8b34F4E247bb4d82ec15463EB7c9A83A3";
const ARENA = "0xB10FaBc2DFa536E4F0d853057e83663e91Bdd74B";

const DEMO_WALLETS = [
  {
    label: "Alice",
    targetSignal: "1200"
  },
  {
    label: "Bob",
    targetSignal: "1200"
  },
  {
    label: "Carol",
    targetSignal: "1200"
  }
];

const DEMO_DUELS = [
  {
    label: "Macro June",
    agentAId: 1,
    agentBId: 2,
    description: "¿Bitcoin cierra junio de 2026 arriba de $115K?",
    durationSeconds: 3 * 86400,
    bets: [
      { wallet: "Alice", agentId: 1, amount: "300" },
      { wallet: "Bob", agentId: 2, amount: "200" },
      { wallet: "Carol", agentId: 1, amount: "100" }
    ]
  },
  {
    label: "Hurricane Season",
    agentAId: 3,
    agentBId: 1,
    description: "¿La temporada atlántica 2026 nombra al menos 5 huracanes antes del 1 de octubre de 2026?",
    durationSeconds: 4 * 86400,
    bets: [
      { wallet: "Alice", agentId: 3, amount: "150" },
      { wallet: "Bob", agentId: 1, amount: "150" },
      { wallet: "Carol", agentId: 3, amount: "75" }
    ]
  }
];

async function waitFor(tx, label) {
  const receipt = await tx.wait();
  console.log(`${label}: ${tx.hash}`);
  return receipt;
}

async function topUpWallet(owner, signal, walletConfig, wallet) {
  const ethTarget = hre.ethers.parseEther("0.003");
  const signalTarget = hre.ethers.parseEther(walletConfig.targetSignal);
  const ethBalance = await hre.ethers.provider.getBalance(wallet.address);
  const signalBalance = await signal.balanceOf(wallet.address);

  if (ethBalance < ethTarget) {
    await waitFor(
      await owner.sendTransaction({ to: wallet.address, value: ethTarget - ethBalance }),
      `${walletConfig.label} +ETH`
    );
  }

  if (signalBalance < signalTarget) {
    await waitFor(
      await signal.transfer(wallet.address, signalTarget - signalBalance),
      `${walletConfig.label} +SIGNAL`
    );
  }
}

async function ensureAllowance(signal, wallet, amountWei) {
  const allowance = await signal.allowance(wallet.address, ARENA);
  if (allowance >= amountWei) return;
  await waitFor(
    await signal.connect(wallet).approve(ARENA, amountWei),
    `${wallet.address} approve ${hre.ethers.formatEther(amountWei)} SIGNAL`
  );
}

async function createOrReuseDuel(arena, duelConfig) {
  const duelCount = Number(await arena.duelCount());
  for (let duelId = 1; duelId <= duelCount; duelId += 1) {
    const duel = await arena.duels(duelId);
    if (duel.eventDescription === duelConfig.description) {
      console.log(`Reusing duel #${duelId} for "${duelConfig.label}"`);
      return duelId;
    }
  }

  await waitFor(
    await arena.createDuel(
      duelConfig.agentAId,
      duelConfig.agentBId,
      duelConfig.description,
      duelConfig.durationSeconds
    ),
    `Create duel "${duelConfig.label}"`
  );

  return Number(await arena.duelCount());
}

async function placeBet(arena, signal, wallet, duelId, betConfig) {
  const amountWei = hre.ethers.parseEther(betConfig.amount);
  const existingBet = await arena.bets(duelId, wallet.address);
  if (existingBet > 0n) {
    console.log(`Skipping bet for ${wallet.address} on duel #${duelId}: wallet already has a side.`);
    return;
  }

  await ensureAllowance(signal, wallet, amountWei);
  await waitFor(
    await arena.connect(wallet).bet(duelId, betConfig.agentId, amountWei),
    `${wallet.address} bet ${betConfig.amount} SIGNAL on agent ${betConfig.agentId} for duel #${duelId}`
  );
}

async function main() {
  const [owner] = await hre.ethers.getSigners();
  const signal = await hre.ethers.getContractAt("SignalToken", SIGNAL);
  const arena = await hre.ethers.getContractAt("Arena", ARENA);

  const wallets = Object.fromEntries(
    DEMO_WALLETS.map((config) => [
      config.label,
      hre.ethers.Wallet.createRandom().connect(hre.ethers.provider)
    ])
  );

  console.log("Owner:", owner.address, "ETH:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(owner.address)));
  console.log("Arena:", ARENA);
  console.log("Signal:", SIGNAL);

  for (const walletConfig of DEMO_WALLETS) {
    const wallet = wallets[walletConfig.label];
    console.log(`${walletConfig.label}:`, wallet.address);
    await topUpWallet(owner, signal, walletConfig, wallet);
  }

  for (const duelConfig of DEMO_DUELS) {
    console.log(`\n--- ${duelConfig.label} ---`);
    const duelId = await createOrReuseDuel(arena, duelConfig);
    const duelBefore = await arena.duels(duelId);
    if (duelBefore.totalPoolA > 0n || duelBefore.totalPoolB > 0n) {
      console.log(`Skipping duel #${duelId}: it already has seeded liquidity.`);
      continue;
    }

    for (const betConfig of duelConfig.bets) {
      const wallet = wallets[betConfig.wallet];
      await placeBet(arena, signal, wallet, duelId, betConfig);
    }

    const duel = await arena.duels(duelId);
    console.log(`Duel #${duelId}: ${duel.eventDescription}`);
    console.log("Pool A:", hre.ethers.formatEther(duel.totalPoolA), "SIGNAL");
    console.log("Pool B:", hre.ethers.formatEther(duel.totalPoolB), "SIGNAL");
  }

  console.log("\n✅ Demo setup complete");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
