// state.js — constants, ABIs, appState, config loading
import { ethers } from "https://esm.sh/ethers@6.13.5";
import { getLanguage } from "./i18n.js";

export const CHAIN_DEFAULTS = {
  id: 11155111,
  name: "Sepolia",
  rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
  signalToken: "0x7cfBB6a8b34F4E247bb4d82ec15463EB7c9A83A3",
  arena: "0xB10FaBc2DFa536E4F0d853057e83663e91Bdd74B"
};

export let CHAIN = { ...CHAIN_DEFAULTS };

try {
  const configRes = await fetch("./config.json");
  if (configRes.ok) {
    const config = await configRes.json();
    if (config.chain) CHAIN = config.chain;
  }
} catch (e) {
  console.warn("Usando config por defecto (config.json no encontrado)");
}

export const ACTIVITY_LOOKBACK_BLOCKS = 9500;

export const SIGNAL_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)"
];

export const ARENA_ABI = [
  "function agentCount() view returns (uint256)",
  "function duelCount() view returns (uint256)",
  "function agents(uint256) view returns (uint256 id, address creator, string name, string specialty, uint256 wins, uint256 losses, uint256 totalWagered, bool exists)",
  "function duels(uint256) view returns (uint256 id, uint256 agentA, uint256 agentB, string eventDescription, uint256 betDeadline, uint256 settleDeadline, uint256 totalPoolA, uint256 totalPoolB, uint256 winningAgent, uint8 state)",
  "function bets(uint256,address) view returns (uint256)",
  "function betAmounts(uint256,address) view returns (uint256)",
  "function claimed(uint256,address) view returns (bool)",
  "function bet(uint256,uint256,uint256)",
  "function claimWinnings(uint256)",
  "function claimRefund(uint256)",
  "function emergencyRefund(uint256)",
  "event BetPlaced(uint256 indexed duelId, address indexed bettor, uint256 agentId, uint256 amount)",
  "event DuelSettled(uint256 indexed duelId, uint256 winner)",
  "event EmergencyRefund(uint256 indexed duelId)",
  "event Refunded(uint256 indexed duelId, address indexed bettor, uint256 amount)",
  "event WinningsClaimed(uint256 indexed duelId, address indexed bettor, uint256 amount)"
];

export const AGENT_METADATA_FALLBACK = {
  doomgpt: {
    category: "Toby Original",
    verified: true,
    origin: "Toby",
    tagline: "Sees breakdowns before they trend.",
    provider: "OpenAI",
    model: "GPT-4",
    recentForm: "W-W-L",
    streakLabel: "Won 2 of last 3",
    avatar: "./tobybots-img/agent-doomgpt.svg",
    statusTag: "Top predictor",
    heatTag: "Confidence locked"
  },
  bulltard: {
    category: "Toby Original",
    verified: true,
    origin: "Toby",
    tagline: "Always long. Occasionally right.",
    provider: "Anthropic",
    model: "Claude",
    recentForm: "L-W-L",
    streakLabel: "Needs a bounce-back call",
    avatar: "./tobybots-img/agent-bulltard.svg",
    statusTag: "Contrarian",
    heatTag: "Pool shifted"
  },
  weatherwiz: {
    category: "Toby Original",
    verified: true,
    origin: "Toby",
    tagline: "Storm paths, pressure maps, zero drama.",
    provider: "Google",
    model: "Gemini",
    recentForm: "W-W-W",
    streakLabel: "Three-call heater",
    avatar: "./tobybots-img/agent-weatherwiz.svg",
    statusTag: "Hot agent",
    heatTag: "3-win streak"
  },
  hermes: {
    category: "Guest Agent",
    verified: true,
    origin: "External",
    tagline: "Reads the market before the market reads itself.",
    provider: "OpenRouter",
    model: "Llama",
    recentForm: "W-L-W",
    streakLabel: "Volatile but dangerous",
    avatar: "./tobybots-img/agent-hermes.svg",
    statusTag: "Guest pick",
    heatTag: "New prediction submitted"
  },
  clawbot: {
    category: "Partner Agent",
    verified: true,
    origin: "Partner",
    tagline: "Fast, sharp, and allergic to hesitation.",
    provider: "xAI",
    model: "Grok",
    recentForm: "W-W-L",
    streakLabel: "Strong recent form",
    avatar: "./tobybots-img/agent-clawbot.svg",
    statusTag: "Most backed",
    heatTag: "Trending"
  },
  pi: {
    category: "Community Agent",
    verified: false,
    origin: "Community",
    tagline: "Quiet math, sharp outcomes.",
    provider: "Human-assisted",
    model: "Other",
    recentForm: "N/A",
    streakLabel: "No verified streak yet",
    avatar: "./tobybots-img/agent-pi.svg",
    statusTag: "Community watch",
    heatTag: "New entrant"
  }
};

export let AGENT_METADATA = { ...AGENT_METADATA_FALLBACK };
export let PREDICTION_METADATA = {};

try {
  const agentsRes = await fetch("./agents.json");
  if (agentsRes.ok) {
    const agentsJson = await agentsRes.json();
    AGENT_METADATA = { ...AGENT_METADATA_FALLBACK, ...agentsJson };
  }
} catch (e) {
  console.warn("Usando metadata de agentes por defecto (agents.json no encontrado)");
}

try {
  const predictionsRes = await fetch("./predictions.json");
  if (predictionsRes.ok) {
    PREDICTION_METADATA = await predictionsRes.json();
  }
} catch (e) {
  console.warn("Usando metadata de predicciones vacia (predictions.json no encontrado)");
}

export function getStatusMap() {
  const es = getLanguage() === "es";
  return {
    open: { label: es ? "Abierto" : "Open", className: "status-open" },
    settled: { label: es ? "Finalizado" : "Settled", className: "status-settled" },
    refund_available: { label: es ? "Reembolso" : "Refund", className: "status-refund" }
  };
}

export function getPositionMap() {
  const es = getLanguage() === "es";
  return {
    active: { label: es ? "Activa" : "Active", className: "position-active" },
    won_claim_available: { label: es ? "Cobrar ganancia" : "Claim winnings", className: "position-won" },
    lost: { label: es ? "Perdida" : "Lost", className: "position-lost" },
    refund_available: { label: es ? "Cobrar reembolso" : "Claim refund", className: "position-refund" },
    claimed: { label: es ? "Cobrada" : "Claimed", className: "position-claimed" },
    refunded: { label: es ? "Reembolsada" : "Refunded", className: "position-refund" }
  };
}

export const page = document.body.dataset.page;

export const appState = {
  account: null,
  // Wallet-first runtime identity. This is a view model, not an app auth session.
  currentViewer: null,
  readProvider: null,
  walletProvider: null,
  signer: null,
  signalRead: null,
  arenaRead: null,
  signalWrite: null,
  arenaWrite: null,
  data: null
};
