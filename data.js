// data.js — on-chain data fetching and model building
import { CHAIN, AGENT_METADATA, PREDICTION_METADATA, ACTIVITY_LOOKBACK_BLOCKS, appState } from "./state.js";
import { formatTokenNumber, deriveTimeLabel, calculatePayout, shortAddress } from "./utils.js";
import { getLanguage } from "./i18n.js";

const isSpanish = () => getLanguage() === "es";

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
    user: await buildUser(account, duels),
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
    prompt: rawDuel.eventDescription,
    summary: rawDuel.eventDescription,
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
      provider: raw.provider || agent?.provider || "Unknown",
      model: raw.model || agent?.model || "Unknown",
      category: raw.category || agent?.specialty || "general",
      confidence: Number(raw.confidence || 0)
    } : {
      id: `duel-${duelId}-agent-${agentId}-placeholder`,
      duelId: String(duelId),
      agentId: String(agentId),
      predictionValue: "TBD",
      predictionLabel: "Official prediction pending.",
      confidence: 0,
      provider: agent?.provider || "Unknown",
      model: agent?.model || "Unknown",
      category: agent?.specialty || "general",
      shortReasoning: "No official submission has been published for this side yet.",
      submittedAt: null,
      sourceType: "official"
    };
  }

  return { byAgentId };
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

// ─── User ──────────────────────────────────────────────────────

async function buildUser(account, duels) {
  if (!account) {
    return {
      walletAddress: isSpanish() ? "Wallet no conectada" : "Wallet not connected",
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
