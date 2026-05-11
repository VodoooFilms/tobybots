const { ethers } = require("ethers");
require("dotenv").config();

const RPC_URL = process.env.SEPOLIA_RPC || "https://ethereum-sepolia-rpc.publicnode.com";
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const SIGNAL = "0x7cfBB6a8b34F4E247bb4d82ec15463EB7c9A83A3";
const ARENA = "0xB10FaBc2DFa536E4F0d853057e83663e91Bdd74B";

const SIGNAL_ABI = [
  "function transfer(address,uint256) returns (bool)",
  "function approve(address,uint256) returns (bool)",
  "function balanceOf(address) view returns (uint256)"
];

const ARENA_ABI = [
  "function duelCount() view returns (uint256)",
  "function createDuel(uint256,uint256,string,uint256) returns (uint256)",
  "function duels(uint256) view returns (uint256 id, uint256 agentA, uint256 agentB, string eventDescription, uint256 betDeadline, uint256 settleDeadline, uint256 totalPoolA, uint256 totalPoolB, uint256 winningAgent, uint8 state)",
  "function bet(uint256,uint256,uint256)"
];

const DUELS_TO_CREATE = [
  {
    label: "Duel #4",
    agentAId: 1,
    agentBId: 2,
    description: "¿La Fed recorta al menos 25 bps antes del 31 de julio de 2026?",
    durationSeconds: 72 * 3600,
    ownerBet: { agentId: 1, amount: "40" },
    challengerBet: { agentId: 2, amount: "30" }
  },
  {
    label: "Duel #5",
    agentAId: 3,
    agentBId: 1,
    description: "¿SpaceX logra una misión orbital exitosa de Starship antes del 30 de septiembre de 2026?",
    durationSeconds: 96 * 3600,
    ownerBet: { agentId: 3, amount: "35" },
    challengerBet: { agentId: 1, amount: "35" }
  },
  {
    label: "Duel #6",
    agentAId: 2,
    agentBId: 3,
    description: "¿El precio spot del oro supera los $3,600 antes del 31 de agosto de 2026?",
    durationSeconds: 120 * 3600,
    ownerBet: { agentId: 2, amount: "45" },
    challengerBet: { agentId: 3, amount: "30" }
  },
  {
    label: "Duel #7",
    agentAId: 3,
    agentBId: 1,
    description: "¿NOAA nombra al menos 3 huracanes en el Atlántico antes del 1 de octubre de 2026?",
    durationSeconds: 144 * 3600,
    ownerBet: { agentId: 3, amount: "50" },
    challengerBet: { agentId: 1, amount: "25" }
  },
  {
    label: "Duel #8",
    agentAId: 1,
    agentBId: 2,
    description: "¿Ethereum cierra octubre de 2026 arriba de $5,000?",
    durationSeconds: 168 * 3600,
    ownerBet: { agentId: 1, amount: "60" },
    challengerBet: { agentId: 2, amount: "40" }
  }
];

function ensurePrivateKey() {
  if (!PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY no configurada en .env");
  }
}

async function waitFor(tx, label) {
  const receipt = await tx.wait();
  console.log(`${label}: ${tx.hash}`);
  return receipt;
}

async function topUpWallet(owner, signal, wallet, signalAmount) {
  const ethTarget = ethers.parseEther("0.002");
  const signalTarget = ethers.parseEther(signalAmount);
  const ethBalance = await owner.provider.getBalance(wallet.address);
  const signalBalance = await signal.balanceOf(wallet.address);

  if (ethBalance < ethTarget) {
    await waitFor(
      await owner.sendTransaction({ to: wallet.address, value: ethTarget - ethBalance }),
      `  ETH sent to ${wallet.address}`
    );
  }

  if (signalBalance < signalTarget) {
    await waitFor(
      await signal.connect(owner).transfer(wallet.address, signalTarget - signalBalance),
      `  SIGNAL sent to ${wallet.address}`
    );
  }
}

async function placeBet(signal, arena, bettor, duelId, agentId, amount) {
  const amountWei = ethers.parseEther(amount);
  await waitFor(await signal.connect(bettor).approve(ARENA, amountWei), `  approve ${amount} SIGNAL`);
  await waitFor(await arena.connect(bettor).bet(duelId, agentId, amountWei), `  bet ${amount} SIGNAL on agent ${agentId}`);
}

async function main() {
  ensurePrivateKey();

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const owner = new ethers.Wallet(PRIVATE_KEY, provider);
  const signal = new ethers.Contract(SIGNAL, SIGNAL_ABI, provider);
  const arena = new ethers.Contract(ARENA, ARENA_ABI, provider);
  const ownerSignal = signal.connect(owner);
  const ownerArena = arena.connect(owner);
  const challenger = ethers.Wallet.createRandom().connect(provider);

  console.log(`Owner: ${owner.address}`);
  console.log(`ETH: ${ethers.formatEther(await provider.getBalance(owner.address))}`);
  console.log(`SIGNAL: ${ethers.formatEther(await ownerSignal.balanceOf(owner.address))}`);
  console.log(`Arena: ${ARENA}`);

  let duelCount = Number(await arena.duelCount());
  console.log(`Current duelCount: ${duelCount}`);

  const existingDescriptions = [];
  for (let duelId = 1; duelId <= duelCount; duelId += 1) {
    const duel = await arena.duels(duelId);
    existingDescriptions.push(duel.eventDescription);
  }

  for (const duelConfig of DUELS_TO_CREATE) {
    if (existingDescriptions.includes(duelConfig.description)) {
      console.log(`\nSkipping ${duelConfig.label}: description already exists on-chain.`);
      continue;
    }

    console.log(`\nCreating ${duelConfig.label}`);
    await waitFor(
      await ownerArena.createDuel(
        duelConfig.agentAId,
        duelConfig.agentBId,
        duelConfig.description,
        duelConfig.durationSeconds
      ),
      `  create ${duelConfig.label}`
    );

    duelCount = Number(await arena.duelCount());
    const duelId = duelCount;
    const totalChallengerStake = duelConfig.challengerBet.amount;

    await topUpWallet(owner, ownerSignal, challenger, totalChallengerStake);
    await placeBet(ownerSignal, ownerArena, owner, duelId, duelConfig.ownerBet.agentId, duelConfig.ownerBet.amount);
    await placeBet(signal, arena, challenger, duelId, duelConfig.challengerBet.agentId, duelConfig.challengerBet.amount);

    const duel = await arena.duels(duelId);
    console.log(`  Duel #${duelId}: ${duel.eventDescription}`);
    console.log(`  Pool A: ${ethers.formatEther(duel.totalPoolA)} SIGNAL`);
    console.log(`  Pool B: ${ethers.formatEther(duel.totalPoolB)} SIGNAL`);
    console.log(`  Bet deadline: ${new Date(Number(duel.betDeadline) * 1000).toISOString()}`);
  }

  console.log(`\nFinal duelCount: ${await arena.duelCount()}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
