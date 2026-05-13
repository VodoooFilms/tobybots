// data.js — on-chain data fetching and wallet-first view model building
import { CHAIN, AGENT_METADATA, PREDICTION_METADATA, DUEL_METADATA, ACTIVITY_LOOKBACK_BLOCKS, appState } from "./state.js?v=3";
import { formatTokenNumber, deriveTimeLabel, calculatePayout, shortAddress } from "./utils.js?v=3";
import { getLanguage } from "./i18n.js?v=3";

const isSpanish = () => getLanguage() === "es";

// Architecture boundary:
// - Blockchain = economic truth (balances, bets, positions, settlement, refunds)
// - Firestore = product metadata layer (duel copy, bot metadata, submissions, config, logs)
// The viewer below is intentionally derived at runtime from on-chain state.

// ─── Main orchestrator ─────────────────────────────────────────

export async function buildAppData(account) {
  const [agentCountRaw, duelCountRaw] = await Promise.all([
    appState.arenaRead.agentCount(),
    appState.arenaRead.duelCount()
  ]);

  const agents = await Promise.all(
    Array.from({ length: Number(agentCountRaw) }, (_, index) => buildAgent(index + 1))
  );
  const agentsById = Object.fromEntries(agents.map((agent) => [agent.id, agent]));

  const rawDuels = await Promise.all(
    Array.from({ length: Number(duelCountRaw) }, (_, index) => appState.arenaRead.duels(index + 1))
  );
  const duels = await Promise.all(rawDuels.map((duel) => buildDuel(duel, agentsById, account)));
  duels.push(...buildFallbackDuels(duels, agentsById));
  const activities = await buildActivities(agentsById);

  return {
    meta: {
      productName: "Toby Bots Arena",
      tokenSymbol: "SIGNAL",
      network: CHAIN.name,
      contracts: {
        signalToken: CHAIN.signalToken,
        arena: CHAIN.arena
      },
      featuredDuelIds: [...duels]
        .sort((a, b) => b.pools.totalSignal - a.pools.totalSignal)
        .slice(0, 3)
        .map((duel) => duel.id)
    },
    viewer: await buildWalletViewer(account, duels),
    agents,
    agentsById,
    duels,
    activities
  };
}

// ─── Agent ─────────────────────────────────────────────────────

async function buildAgent(id) {
  const raw = await appState.arenaRead.agents(id);
  const slug = raw.name.toLowerCase();
    const meta = AGENT_METADATA[slug] || {
      category: "Community Agent",
      verified: false,
      origin: "Community",
      tagline: isSpanish() ? `${raw.name} entra a la arena buscando su primer gran duelo.` : `${raw.name} enters the arena looking for a first breakout duel.`,
      provider: "Unknown",
      model: "Unknown",
      recentForm: "N/A",
      streakLabel: isSpanish() ? "Sin historial" : "No track record yet"
  };
  const wins = Number(raw.wins);
  const losses = Number(raw.losses);
  const totalMatches = wins + losses;

  return {
    id: String(raw.id),
    name: raw.name,
    slug,
    category: meta.category,
    verified: meta.verified,
    specialty: raw.specialty,
    tagline: meta.tagline,
    origin: meta.origin,
    provider: meta.provider,
    model: meta.model,
    avatar: meta.avatar || null,
    statusTag: meta.statusTag || "Tracked agent",
    heatTag: meta.heatTag || "Live",
    record: {
      wins,
      losses,
      winRate: totalMatches ? Math.round((wins / totalMatches) * 100) : 0
    },
    stats: {
      totalBackedSignal: formatTokenNumber(raw.totalWagered),
      activeDuels: 0,
      totalPredictions: totalMatches,
      recentForm: meta.recentForm || "N/A",
      streak: meta.streakLabel || (totalMatches ? (isSpanish() ? `Récord ${wins}-${losses}` : `Record ${wins}-${losses}`) : (isSpanish() ? "Sin historial" : "No track record")),
      aliveSignal: meta.heatTag || "Live"
    }
  };
}

// ─── Duel ──────────────────────────────────────────────────────

async function buildDuel(rawDuel, agentsById, account) {
  const duelId = String(rawDuel.id);
  const agentAId = String(rawDuel.agentA);
  const agentBId = String(rawDuel.agentB);
  const localizedCopy = getLocalizedDuelCopy(duelId, rawDuel.eventDescription);
  const totalPoolA = formatTokenNumber(rawDuel.totalPoolA);
  const totalPoolB = formatTokenNumber(rawDuel.totalPoolB);
  const totalSignal = totalPoolA + totalPoolB;
  const percentA = totalSignal ? Math.round((totalPoolA / totalSignal) * 100) : 50;
  const state = Number(rawDuel.state);

  const duel = {
    id: duelId,
    slug: `${agentAId}-${agentBId}-${duelId}`,
    title: `${agentsById[agentAId].name} vs ${agentsById[agentBId].name}`,
    status: state === 2 ? "settled" : state === 1 ? "refund_available" : "open",
    featured: false,
    agentAId,
    agentBId,
    prompt: localizedCopy.prompt,
    summary: localizedCopy.summary,
    pools: {
      agentASignal: totalPoolA,
      agentBSignal: totalPoolB,
      totalSignal,
      agentAPercent: percentA,
      agentBPercent: 100 - percentA,
      totalBackers: 0
    },
    timing: {
      timeLeftLabel: deriveTimeLabel(rawDuel, state),
      betDeadlineIso: new Date(Number(rawDuel.betDeadline) * 1000).toISOString(),
      settleDeadlineIso: new Date(Number(rawDuel.settleDeadline) * 1000).toISOString()
    },
    result: {
      winnerAgentId: Number(rawDuel.winningAgent) > 0 ? String(rawDuel.winningAgent) : null,
      winnerDeclaredLabel: Number(rawDuel.winningAgent) > 0 ? agentsById[String(rawDuel.winningAgent)]?.name || null : null
    },
    predictions: buildPredictions(duelId, [agentAId, agentBId], agentsById),
    liveSignal: deriveDuelSignal(rawDuel, agentAId, agentBId, agentsById, totalSignal),
    isSynthetic: false,
    userPosition: null,
    _account: account
  };

  if (duel.status === "open") {
    agentsById[agentAId].stats.activeDuels += 1;
    agentsById[agentBId].stats.activeDuels += 1;
    agentsById[agentAId].stats.totalPredictions += 1;
    agentsById[agentBId].stats.totalPredictions += 1;
  }

  if (!account) return duel;

  const [betAgentRaw, betAmountRaw, claimed] = await Promise.all([
    appState.arenaRead.bets(duelId, account),
    appState.arenaRead.betAmounts(duelId, account),
    appState.arenaRead.claimed(duelId, account)
  ]);

  if (Number(betAgentRaw) === 0 || betAmountRaw === 0n) return duel;

  const selectedAgentId = String(betAgentRaw);
  const amountSignal = formatTokenNumber(betAmountRaw);
  const winner = duel.result.winnerAgentId;
  const won = winner && winner === selectedAgentId;

  let positionStatus = "active";
  let claimableSignal = 0;
  let refundSignal = 0;

  if (duel.status === "settled") {
    if (won && !claimed) {
      positionStatus = "won_claim_available";
      claimableSignal = calculatePayout(duel, selectedAgentId, amountSignal);
    } else if (won && claimed) {
      positionStatus = "claimed";
    } else {
      positionStatus = claimed ? "claimed" : "lost";
    }
  }

  if (duel.status === "refund_available") {
    positionStatus = claimed ? "refunded" : "refund_available";
    refundSignal = claimed ? 0 : amountSignal;
  }

  duel.userPosition = {
    selectedAgentId,
    selectedAgentName: agentsById[selectedAgentId]?.name || "Bot",
    amountSignal,
    status: positionStatus,
    claimableSignal,
    refundSignal
  };

  return duel;
}

function buildPredictions(duelId, agentIds, agentsById) {
  const duelPredictions = PREDICTION_METADATA[duelId] || {};
  const byAgentId = {};

  for (const agentId of agentIds) {
    const raw = duelPredictions[agentId];
    const agent = agentsById[agentId];
    byAgentId[agentId] = raw ? {
      ...raw,
      duelId: String(raw.duelId),
      agentId: String(raw.agentId),
      predictionLabel: getLocalizedPredictionLabel(duelId, agentId, raw.predictionLabel),
      provider: raw.provider || agent?.provider || "Unknown",
      model: raw.model || agent?.model || "Unknown",
      category: raw.category || agent?.specialty || "general",
      confidence: Number(raw.confidence || 0),
      shortReasoning: getLocalizedPredictionReasoning(duelId, agentId, raw.shortReasoning)
    } : {
      id: `duel-${duelId}-agent-${agentId}-placeholder`,
      duelId: String(duelId),
      agentId: String(agentId),
      predictionValue: "TBD",
      predictionLabel: isSpanish() ? "Predicción oficial pendiente." : "Official prediction pending.",
      confidence: 0,
      provider: agent?.provider || "Unknown",
      model: agent?.model || "Unknown",
      category: agent?.specialty || "general",
      shortReasoning: isSpanish() ? "Todavía no se publicó una submission oficial para este lado." : "No official submission has been published for this side yet.",
      submittedAt: null,
      sourceType: "official"
    };
  }

  return { byAgentId };
}

function getLocalizedDuelCopy(duelId, fallbackPrompt = "") {
  const meta = DUEL_METADATA[duelId];
  return {
    prompt: isSpanish() ? (meta?.prompt?.es || fallbackPrompt) : (meta?.prompt?.en || fallbackPrompt),
    summary: isSpanish()
      ? (meta?.summary?.es || meta?.prompt?.es || fallbackPrompt)
      : (meta?.summary?.en || meta?.prompt?.en || fallbackPrompt)
  };
}

function getLocalizedPredictionLabel(duelId, agentId, fallbackLabel) {
  if (!isSpanish()) return fallbackLabel;
  return DUEL_METADATA[duelId]?.predictions?.[agentId]?.predictionLabelEs || fallbackLabel;
}

function getLocalizedPredictionReasoning(duelId, agentId, fallbackReasoning) {
  if (!isSpanish()) return fallbackReasoning;
  return DUEL_METADATA[duelId]?.predictions?.[agentId]?.shortReasoningEs || fallbackReasoning;
}

function buildFallbackDuels(existingDuels, agentsById) {
  const existingIds = new Set(existingDuels.map((duel) => duel.id));
  const fallbackIds = Object.keys(DUEL_METADATA)
    .filter((duelId) => DUEL_METADATA[duelId]?.fallback && !existingIds.has(String(duelId)))
    .sort((a, b) => Number(a) - Number(b));

  return fallbackIds.map((duelId) => {
    const meta = DUEL_METADATA[duelId];
    const fallback = meta.fallback;
    const agentAId = String(fallback.agentAId);
    const agentBId = String(fallback.agentBId);
    const totalPoolA = Number(fallback.poolA || 0);
    const totalPoolB = Number(fallback.poolB || 0);
    const totalSignal = totalPoolA + totalPoolB;
    const percentA = totalSignal ? Math.round((totalPoolA / totalSignal) * 100) : 50;
    const state = fallback.state === "settled" ? 2 : fallback.state === "refund_available" ? 1 : 0;
    const rawLike = {
      id: duelId,
      betDeadline: Math.floor(new Date(fallback.betDeadlineIso).getTime() / 1000),
      settleDeadline: Math.floor(new Date(fallback.settleDeadlineIso).getTime() / 1000),
      state
    };
    const duel = {
      id: String(duelId),
      slug: `${agentAId}-${agentBId}-${duelId}`,
      title: `${agentsById[agentAId].name} vs ${agentsById[agentBId].name}`,
      status: state === 2 ? "settled" : state === 1 ? "refund_available" : "open",
      featured: false,
      agentAId,
      agentBId,
      prompt: getLocalizedDuelCopy(String(duelId), "").prompt,
      summary: getLocalizedDuelCopy(String(duelId), "").summary,
      pools: {
        agentASignal: totalPoolA,
        agentBSignal: totalPoolB,
        totalSignal,
        agentAPercent: percentA,
        agentBPercent: 100 - percentA,
        totalBackers: 0
      },
      timing: {
        timeLeftLabel: deriveTimeLabel(rawLike, state),
        betDeadlineIso: fallback.betDeadlineIso,
        settleDeadlineIso: fallback.settleDeadlineIso
      },
      result: {
        winnerAgentId: null,
        winnerDeclaredLabel: null
      },
      predictions: buildPredictions(String(duelId), [agentAId, agentBId], agentsById),
      liveSignal: "New prediction submitted",
      isSynthetic: true,
      userPosition: null,
      _account: null
    };

    if (duel.status === "open") {
      agentsById[agentAId].stats.activeDuels += 1;
      agentsById[agentBId].stats.activeDuels += 1;
      agentsById[agentAId].stats.totalPredictions += 1;
      agentsById[agentBId].stats.totalPredictions += 1;
    }

    return duel;
  });
}

function deriveDuelSignal(rawDuel, agentAId, agentBId, agentsById, totalSignal) {
  const duelPredictions = PREDICTION_METADATA[String(rawDuel.id)] || {};
  const predictionA = duelPredictions[agentAId];
  const predictionB = duelPredictions[agentBId];
  const topConfidence = Math.max(Number(predictionA?.confidence || 0), Number(predictionB?.confidence || 0));

  if (topConfidence >= 75) return "Confidence locked";
  if (totalSignal >= 100) return "Most backed today";
  if (agentsById[agentAId]?.stats.recentForm === "W-W-W" || agentsById[agentBId]?.stats.recentForm === "W-W-W") return "Hot streak";
  return "New prediction submitted";
}

// ─── Viewer ────────────────────────────────────────────────────

async function buildWalletViewer(account, duels) {
  if (!account) {
    return {
      type: "visitor",
      walletAddress: null,
      displayName: isSpanish() ? "Visitante" : "Visitor",
      signalBalance: 0,
      summary: { totalBackedSignal: 0, claimableSignal: 0, refundableSignal: 0, lifetimeWinningsSignal: 0 },
      positions: []
    };
  }

  const signalBalance = formatTokenNumber(await appState.signalRead.balanceOf(account));
  const positions = duels
    .filter((duel) => duel.userPosition)
    .map((duel) => ({
      duelId: duel.id,
      duelTitle: duel.title,
      selectedAgentId: duel.userPosition.selectedAgentId,
      selectedAgentName: duel.userPosition.selectedAgentName,
      amountSignal: duel.userPosition.amountSignal,
      status: duel.userPosition.status,
      claimableSignal: duel.userPosition.claimableSignal,
      refundSignal: duel.userPosition.refundSignal
    }));

  return {
    type: "wallet",
    walletAddress: account,
    displayName: "Arena Backer",
    signalBalance,
    summary: {
      totalBackedSignal: positions.reduce((sum, item) => sum + item.amountSignal, 0),
      claimableSignal: positions.reduce((sum, item) => sum + item.claimableSignal, 0),
      refundableSignal: positions.reduce((sum, item) => sum + item.refundSignal, 0),
      lifetimeWinningsSignal: 0
    },
    positions
  };
}

// ─── Activities ────────────────────────────────────────────────

async function buildActivities(agentsById) {
  try {
    const latestBlock = await appState.readProvider.getBlockNumber();
    const fromBlock = Math.max(0, latestBlock - ACTIVITY_LOOKBACK_BLOCKS);
    const [bets, settled, refunds, winnings, refundClaims] = await Promise.all([
      appState.arenaRead.queryFilter(appState.arenaRead.filters.BetPlaced(), fromBlock, latestBlock),
      appState.arenaRead.queryFilter(appState.arenaRead.filters.DuelSettled(), fromBlock, latestBlock),
      appState.arenaRead.queryFilter(appState.arenaRead.filters.EmergencyRefund(), fromBlock, latestBlock),
      appState.arenaRead.queryFilter(appState.arenaRead.filters.WinningsClaimed(), fromBlock, latestBlock),
      appState.arenaRead.queryFilter(appState.arenaRead.filters.Refunded(), fromBlock, latestBlock)
    ]);

    const events = [
      ...bets.map((event) => ({ type: "bet", event })),
      ...settled.map((event) => ({ type: "settled", event })),
      ...refunds.map((event) => ({ type: "refund-open", event })),
      ...winnings.map((event) => ({ type: "claim", event })),
      ...refundClaims.map((event) => ({ type: "refund-claim", event }))
    ].sort((a, b) => Number(b.event.blockNumber) - Number(a.event.blockNumber)).slice(0, 8);

    const timestamps = {};
    for (const item of events) {
      const blockNumber = Number(item.event.blockNumber);
      if (!timestamps[blockNumber]) {
        const block = await appState.readProvider.getBlock(blockNumber);
        timestamps[blockNumber] = new Date(Number(block.timestamp) * 1000).toISOString();
      }
    }

    return events.map(({ type, event }, index) => {
      const args = event.args || [];
      const duelId = String(args.duelId || "");
      let label = isSpanish() ? `Actividad en duelo #${duelId}` : `Activity on duel #${duelId}`;

      if (type === "bet") {
        const agent = agentsById[String(args.agentId)];
        label = isSpanish()
          ? `${shortAddress(args.bettor)} respaldó a ${agent?.name || "un bot"} con ${formatTokenNumber(args.amount)} SIGNAL.`
          : `${shortAddress(args.bettor)} backed ${agent?.name || "a bot"} with ${formatTokenNumber(args.amount)} SIGNAL.`;
      }
      if (type === "settled") {
        label = isSpanish()
          ? `Ganador declarado: ${agentsById[String(args.winner)]?.name || "bot"} ganó el duelo #${duelId}.`
          : `Winner declared: ${agentsById[String(args.winner)]?.name || "bot"} won duel #${duelId}.`;
      }
      if (type === "refund-open") {
        label = isSpanish() ? `Se abrieron reembolsos para el duelo #${duelId}.` : `Refunds opened for duel #${duelId}.`;
      }
      if (type === "claim") {
        label = isSpanish()
          ? `${shortAddress(args.bettor)} cobró ${formatTokenNumber(args.amount)} SIGNAL en el duelo #${duelId}.`
          : `${shortAddress(args.bettor)} claimed ${formatTokenNumber(args.amount)} SIGNAL on duel #${duelId}.`;
      }
      if (type === "refund-claim") {
        label = isSpanish()
          ? `${shortAddress(args.bettor)} recuperó ${formatTokenNumber(args.amount)} SIGNAL en el duelo #${duelId}.`
          : `${shortAddress(args.bettor)} recovered ${formatTokenNumber(args.amount)} SIGNAL on duel #${duelId}.`;
      }

      return {
        id: `${type}-${index}`,
        duelId,
        agentIds: [],
        label,
        timestamp: timestamps[Number(event.blockNumber)]
      };
    });
  } catch (error) {
    console.warn("No pude leer actividad on-chain", error);
    return [];
  }
}
