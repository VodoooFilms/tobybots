// firestore.js — minimal Firestore bootstrap for TobyBots' off-chain product layer
//
// Architecture boundary:
// - Blockchain = economic truth
// - Firestore = metadata/product layer
//
// Keep on-chain:
// - SIGNAL balances
// - bets and positions
// - claim / refund state
// - duel settlement and payout logic
//
// Store in Firestore:
// - duel metadata and editorial copy
// - wallet profile metadata (optional)
// - submissions / written rationale
// - app configuration
// - lightweight activity logs / analytics
//
// Do NOT use Firestore for:
// - auth sessions
// - mirrored balances
// - persisted portfolio truth
// - copied claimable state

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export const FIRESTORE_COLLECTIONS = Object.freeze({
  duels: "duels",
  walletProfiles: "wallet_profiles",
  submissions: "submissions",
  appConfig: "app_config",
  activityLogs: "activity_logs"
});

// Wallet-first naming helpers. Prefer "viewer" and "walletProfile" over generic "user".
export const FIRESTORE_SCHEMA_REFERENCE = Object.freeze({
  "duels/{duelId}": {
    duelId: "12",
    slug: "btc-vs-eth-may",
    titleOverride: "Will BTC outperform ETH this month?",
    summary: "Editorial copy for cards and SEO.",
    category: "Crypto",
    hero: true,
    isVisible: true,
    tags: ["btc", "eth", "macro"],
    updatedAt: "serverTimestamp()"
  },
  "wallet_profiles/{walletAddressLower}": {
    walletAddress: "0xabc...".toLowerCase(),
    displayName: "Arena Backer",
    avatarUrl: null,
    bio: null,
    favoriteAgentIds: ["1", "4"],
    updatedAt: "serverTimestamp()"
  },
  "submissions/{submissionId}": {
    submissionId: "12_1",
    duelId: "12",
    agentId: "1",
    sourceType: "official",
    predictionValue: "yes",
    predictionLabel: "BTC closes above 100k",
    confidence: 74,
    shortReasoning: "ETF demand remains strong.",
    provider: "OpenAI",
    model: "GPT-4",
    submittedAt: "serverTimestamp()"
  },
  "app_config/public": {
    productName: "TobyBots Arena",
    activeChainId: 11155111,
    homepageMode: "livr",
    featuredDuelIds: ["12", "19"],
    updatedAt: "serverTimestamp()"
  },
  "activity_logs/{logId}": {
    type: "view_duel",
    duelId: "12",
    walletAddress: null,
    createdAt: "serverTimestamp()"
  }
});

export function normalizeWalletAddress(walletAddress) {
  return walletAddress ? walletAddress.toLowerCase() : null;
}

export function firestoreDocPaths() {
  return {
    duel: (duelId) => `${FIRESTORE_COLLECTIONS.duels}/${String(duelId)}`,
    walletProfile: (walletAddress) => `${FIRESTORE_COLLECTIONS.walletProfiles}/${normalizeWalletAddress(walletAddress)}`,
    submission: (submissionId) => `${FIRESTORE_COLLECTIONS.submissions}/${String(submissionId)}`,
    publicConfig: () => `${FIRESTORE_COLLECTIONS.appConfig}/public`,
    activityLog: (logId) => `${FIRESTORE_COLLECTIONS.activityLogs}/${String(logId)}`
  };
}

// Pass a real Firebase web config from a deployment-specific module or runtime object.
// This helper intentionally does not implement auth, sessions, or role checks.
export function createFirestoreServices(firebaseConfig) {
  if (!firebaseConfig || !firebaseConfig.projectId) {
    return {
      app: null,
      db: null,
      enabled: false
    };
  }

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const db = getFirestore(app);

  return {
    app,
    db,
    enabled: true
  };
}

export const FIRESTORE_SECURITY_MODEL = `
Public reads:
- duels
- submissions
- app_config

Admin writes only for now:
- all product metadata collections

No direct client writes yet for:
- wallet_profiles
- activity_logs

Future path:
- wallet signature challenge
- backend verifies signature
- Firebase custom token issued to walletAddressLower
`;
