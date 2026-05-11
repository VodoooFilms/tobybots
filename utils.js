// utils.js — pure helper functions (formatting, math, markup generation)
import { ethers } from "https://esm.sh/ethers@6.13.5";
import { getPositionMap, getStatusMap } from "./state.js";
import {
  t,
  getLanguage,
  formatNumberForLanguage,
  formatIsoForLanguage,
  formatPredictionTimestampForLanguage,
  relativeTimestampForLanguage,
  translateTimeLeft
} from "./i18n.js";

const isSpanish = () => getLanguage() === "es";

function translateArenaTag(value) {
  if (!isSpanish()) return value;
  return {
    "Top predictor": "Mejor predictor",
    Contrarian: "Contrarian",
    "Hot agent": "Agente caliente",
    "Guest pick": "Invitado destacado",
    "Most backed": "Más respaldado",
    "Community watch": "Radar comunidad",
    "Tracked agent": "Agente seguido",
    Live: "En vivo",
    Trending: "En tendencia",
    "Confidence locked": "Confianza bloqueada",
    "Pool shifted": "Pool movido",
    "3-win streak": "Racha de 3 victorias",
    "New prediction submitted": "Nueva predicción enviada",
    "Hot streak": "Racha caliente",
    "Won 2 of last 3": "Ganó 2 de las últimas 3",
    "Needs a bounce-back call": "Necesita una llamada de rebote",
    "Three-call heater": "Tres aciertos seguidos",
    "Volatile but dangerous": "Volátil pero peligroso",
    "Strong recent form": "Buena forma reciente",
    "No verified streak yet": "Todavía sin racha verificada",
    "New entrant": "Nuevo participante"
  }[value] || value;
}

// ─── Formatting ────────────────────────────────────────────────

export function formatNumber(value) {
  return formatNumberForLanguage(value);
}

export function formatTokenNumber(value) {
  return Number(ethers.formatEther(value));
}

export function formatIso(value) {
  return formatIsoForLanguage(value);
}

export function formatPredictionTimestamp(value) {
  return formatPredictionTimestampForLanguage(value);
}

export function relativeTimestamp(value) {
  return relativeTimestampForLanguage(value);
}

export function formatTimeLeft(value) {
  return translateTimeLeft(value);
}

export function shortAddress(address) {
  return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "wallet";
}

export function initials(name) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("");
}

export function truncateText(value, maxLength = 84) {
  if (!value) return "";
  return value.length > maxLength ? `${value.slice(0, maxLength).trim()}...` : value;
}

export function avatarMarkup(agent, size = "default") {
  const className = size === "large" ? "avatar large avatar-image" : size === "small" ? "avatar small avatar-image" : "avatar avatar-image";
  if (agent.avatar) {
    return `<span class="${className}"><img src="${agent.avatar}" alt="${agent.name}" /></span>`;
  }
  return `<span class="${size === "large" ? "avatar large" : size === "small" ? "avatar small" : "avatar"}">${initials(agent.name)}</span>`;
}

export function hasOfficialPrediction(prediction) {
  if (!prediction) return false;
  return prediction.predictionValue && prediction.predictionValue !== "TBD" && Number(prediction.confidence) > 0;
}

// ─── Math ──────────────────────────────────────────────────────

export function calculatePayout(duel, selectedAgentId, amountSignal) {
  const winnerPool = selectedAgentId === duel.agentAId ? duel.pools.agentASignal : duel.pools.agentBSignal;
  const totalPot = duel.pools.totalSignal;
  const arenaFee = Math.floor((totalPot * 200) / 10000);
  const prizePool = totalPot - arenaFee;
  return winnerPool ? Math.floor((amountSignal / winnerPool) * prizePool) : 0;
}

// ─── Time ──────────────────────────────────────────────────────

export function deriveTimeLabel(rawDuel, state) {
  const now = Math.floor(Date.now() / 1000);
  const betDeadline = Number(rawDuel.betDeadline);
  const settleDeadline = Number(rawDuel.settleDeadline);
  if (state === 2) return "Winner declared";
  if (state === 1) return "Refund available";
  if (now <= betDeadline) {
    const remaining = betDeadline - now;
    const hours = Math.floor(remaining / 3600);
    if (hours >= 24) return `${Math.floor(hours / 24)}d left`;
    if (hours >= 1) return `${hours}h left`;
    return `${Math.max(1, Math.floor(remaining / 60))}m left`;
  }
  if (now <= settleDeadline) return "Awaiting verdict";
  return "Refund available";
}

export function duelCountdownParts(duel) {
  const labels = isSpanish() ? ["hrs", "mins", "segs"] : ["hrs", "mins", "secs"];
  if (duel.status !== "open") {
    return [
      { value: "--", label: labels[0] },
      { value: "--", label: labels[1] },
      { value: "--", label: labels[2] }
    ];
  }
  const diff = Math.max(0, new Date(duel.timing.betDeadlineIso).getTime() - Date.now());
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [
    { value: String(hours).padStart(2, "0"), label: labels[0] },
    { value: String(minutes).padStart(2, "0"), label: labels[1] },
    { value: String(seconds).padStart(2, "0"), label: labels[2] }
  ];
}

export function countdownMarkup(parts) {
  return parts.map((part) => `
    <div class="countdown-cell">
      <strong>${part.value}</strong>
      <span>${part.label}</span>
    </div>
  `).join("");
}

// ─── Translations ──────────────────────────────────────────────

export function translateCategory(value) {
  if (!isSpanish()) return value;
  return {
    "Guest Agent": "Agente invitado",
    "Partner Agent": "Agente partner",
    "Community Agent": "Agente comunidad",
    "Toby Original": "Original Toby"
  }[value] || value;
}

export function translateOrigin(value) {
  if (!isSpanish()) return value;
  return {
    External: "Invitado",
    Partner: "Partner",
    Community: "Comunidad",
    Toby: "Toby"
  }[value] || value;
}

// ─── Action labels ─────────────────────────────────────────────

export function actionHeading(duel, position, agentA, agentB) {
  if (!duel._account) return isSpanish() ? "Conecta tu wallet" : "Connect your wallet";
  if (duel.status === "open" && !position) return isSpanish() ? "Respalda al agente en quien confías" : "Back the agent you trust";
  if (position?.status === "won_claim_available") return isSpanish() ? `Cobrar victoria de ${agentName(position.selectedAgentId, agentA, agentB)}` : `Claim ${agentName(position.selectedAgentId, agentA, agentB)} winnings`;
  if (position?.status === "refund_available") return isSpanish() ? "Cobrar reembolso" : "Claim refund";
  if (duel.status === "refund_available" && !position) return isSpanish() ? "Abrir refunds" : "Open refunds";
  return isSpanish() ? "Duelo cerrado" : "Duel closed";
}

export function actionDescription(duel, position) {
  if (!duel._account) return isSpanish() ? "Conecta MetaMask en Sepolia para ver tus posiciones reales y operar con SIGNAL." : "Connect MetaMask on Sepolia to see your real positions and use SIGNAL.";
  if (duel.status === "open" && !position) return isSpanish() ? "Revisa cada submission, compara confianza e historial, y luego respalda el pronóstico que más te convenza." : "Review each submission, compare confidence and track record, then back the forecast you trust.";
  if (position?.status === "won_claim_available") return isSpanish() ? "Esta posición ganó. Tu payout ya está listo para cobrar." : "This position won. Your payout is ready to claim.";
  if (position?.status === "refund_available") return isSpanish() ? "Este duelo expiró sin veredicto. Tu apuesta original puede volver a tu wallet." : "This duel expired without a verdict. Your original stake can return to your wallet.";
  if (duel.status === "refund_available" && !position) return isSpanish() ? "El duelo venció sin settlement. Cualquier wallet puede desbloquear refunds." : "This duel expired without settlement. Any wallet can unlock refunds.";
  if (duel.status === "settled") return isSpanish() ? "El ganador ya fue declarado. Los backers ganadores pueden cobrar y los demás revisar el resultado." : "The winner has already been declared. Winning backers can claim and everyone else can review the result.";
  return isSpanish() ? "Este duelo quedó cerrado para reembolsos individuales." : "This duel is closed for individual refunds.";
}

export function actionButton(duel, position) {
  if (!duel._account) return t("walletConnect");
  if (duel.status === "open" && !position) return isSpanish() ? "Respaldar esta predicción" : "Back this prediction";
  if (position?.status === "won_claim_available") return isSpanish() ? "Cobrar ganancia" : "Claim winnings";
  if (position?.status === "refund_available") return isSpanish() ? "Cobrar reembolso" : "Claim refund";
  if (duel.status === "refund_available" && !position) return isSpanish() ? "Abrir refunds" : "Open refunds";
  if (duel.status === "open" && position) return isSpanish() ? "Ya participas" : "Already entered";
  return isSpanish() ? "Ver portfolio" : "View portfolio";
}

export function agentName(agentId, agentA, agentB) {
  if (agentA.id === agentId) return agentA.name;
  if (agentB.id === agentId) return agentB.name;
  return "bot";
}

// ─── Markup builders ───────────────────────────────────────────

export function summaryMetric(label, value) {
  return `
    <article class="summary-card">
      <div class="summary-card-body">
        <span class="metric-label">${label}</span>
        <strong>${value}</strong>
      </div>
    </article>
  `;
}

export function summaryLine(label, value) {
  return `<div class="summary-line"><span>${label}</span><strong>${value}</strong></div>`;
}

export function overviewCardMarkup(label, value, detail) {
  const withSignalIcon = typeof value === "string" && value.includes("SIGNAL")
    ? value.replace(/^\s*([\d.,]+\s*SIGNAL)\b/, '<span class="signal-inline-value"><img class="signal-inline-icon" src="./tobybots-img/signalcoin_image.png" alt="" aria-hidden="true" /><span>$1</span></span>')
    : value;
  return `
    <article class="overview-card panel">
      <div class="overview-card-body">
        <span class="metric-label">${label}</span>
        <strong>${withSignalIcon}</strong>
        <p>${detail}</p>
      </div>
    </article>
  `;
}

export function activityMarkup(activity) {
  return `<div class="activity-row"><span>${activity.label}</span><span>${relativeTimestamp(activity.timestamp)}</span></div>`;
}

export function recentFormMarkup(form) {
  const tokens = (form || "")
    .split("-")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 5);

  if (!tokens.length) return '<div class="form-strip"><span class="form-chip neutral">N/A</span></div>';

  return `
    <div class="form-strip">
      ${tokens.map((token) => {
        const normalized = token.toUpperCase();
        const className = normalized === "W" ? "win" : normalized === "L" ? "loss" : "neutral";
        return `<span class="form-chip ${className}">${normalized}</span>`;
      }).join("")}
    </div>
  `;
}

export function positionMarkup(position) {
  const state = getPositionMap()[position.status];
  const action = position.status === "won_claim_available"
    ? (isSpanish() ? "Cobrar ganancia" : "Claim winnings")
    : position.status === "refund_available"
      ? (isSpanish() ? "Cobrar reembolso" : "Claim refund")
      : (isSpanish() ? "Ver duelo" : "View duel");
  return `
    <div class="position-row">
      <div>
        <strong>${position.duelTitle}</strong>
        <div class="metric-label">${position.selectedAgentName} · ${formatNumber(position.amountSignal)} SIGNAL</div>
      </div>
      <div class="card-matchup">
        <span class="status-pill ${state.className}">${state.label}</span>
        <a class="button secondary" href="./duel.html?id=${position.duelId}">${action}</a>
      </div>
    </div>
  `;
}

export function agentCardMarkup(agent, options = {}) {
  const { rank = null, featured = false } = options;
  const prestigeClass = rank && rank <= 3 ? ` podium podium-${rank}` : "";
  const cueLabel = translateArenaTag(agent.heatTag || agent.statusTag);
  const liveLabel = agent.stats.activeDuels
    ? isSpanish()
      ? `${agent.stats.activeDuels} duelo${agent.stats.activeDuels === 1 ? "" : "s"} en vivo`
      : `${agent.stats.activeDuels} live duel${agent.stats.activeDuels === 1 ? "" : "s"}`
    : translateArenaTag(agent.stats.aliveSignal);
  return `
    <article class="agent-card${featured ? " featured-leaderboard-card" : ""}${prestigeClass}">
      <div class="card-meta">
        <div class="leaderboard-meta">
          ${rank ? `<span class="leaderboard-rank">#${rank}</span>` : `<span class="status-pill status-open">${translateArenaTag(agent.statusTag)}</span>`}
          <span class="status-pill status-open">${cueLabel}</span>
        </div>
        <span class="metric-label">${liveLabel}</span>
      </div>
      <div class="agent-card-head">
        ${avatarMarkup(agent, "large")}
        <div>
          <h3>${agent.name}</h3>
          <p>${agent.specialty}</p>
        </div>
      </div>
      <div class="card-matchup">
        <span class="badge">${translateCategory(agent.category)}</span>
        <span class="badge">${agent.provider} / ${agent.model}</span>
      </div>
      <div class="agent-card-stats">
        <div><span class="metric-label">${t("winRate")}</span><strong>${agent.record.winRate}%</strong></div>
        <div><span class="metric-label">${t("record")}</span><strong>${agent.record.wins}-${agent.record.losses}</strong></div>
        <div><span class="metric-label">${t("homeMostBacked")}</span><strong>${formatNumber(agent.stats.totalBackedSignal)} SIGNAL</strong></div>
      </div>
      <div class="agent-form-row">
        <div>
          <span class="metric-label">${t("recentForm")}</span>
          ${recentFormMarkup(agent.stats.recentForm)}
        </div>
        <div class="metric-copy">${translateArenaTag(agent.stats.streak)}</div>
      </div>
      <div class="card-footer">
        <div class="metric-label">${t("trendingPredictor")}</div>
        <div class="metric-label">${translateArenaTag(agent.statusTag)}</div>
      </div>
      <a class="button secondary" href="./agent.html?id=${agent.id}">${t("viewProfile")}</a>
    </article>
  `;
}

export function miniDuelRowMarkup(duel, agentsById) {
  const agentA = agentsById[duel.agentAId];
  const agentB = agentsById[duel.agentBId];
  return `
    <a class="mini-row" href="./duel.html?id=${duel.id}">
      <div>
        <strong>${duel.title}</strong>
        <span>${translateArenaTag(duel.liveSignal)} · ${agentA.name} ${duel.predictions.byAgentId[agentA.id].confidence}% · ${agentB.name} ${duel.predictions.byAgentId[agentB.id].confidence}%</span>
      </div>
      <span>${formatTimeLeft(duel.timing.timeLeftLabel)}</span>
    </a>
  `;
}

export function duelCardMarkup(duel, agentsById, compact = false, instanceIndex = 0) {
  const agentA = agentsById[duel.agentAId];
  const agentB = agentsById[duel.agentBId];
  const status = getStatusMap()[duel.status];
  const predictionA = duel.predictions.byAgentId[agentA.id];
  const predictionB = duel.predictions.byAgentId[agentB.id];
  const hasPredictionA = hasOfficialPrediction(predictionA);
  const hasPredictionB = hasOfficialPrediction(predictionB);
  const leadPrediction = predictionA.confidence >= predictionB.confidence
    ? { agent: agentA, prediction: predictionA, percent: duel.pools.agentAPercent, signal: duel.pools.agentASignal }
    : { agent: agentB, prediction: predictionB, percent: duel.pools.agentBPercent, signal: duel.pools.agentBSignal };
  const trailingPrediction = leadPrediction.agent.id === agentA.id
    ? { agent: agentB, prediction: predictionB }
    : { agent: agentA, prediction: predictionA };
  const percentOfPoolText = isSpanish() ? `${leadPrediction.percent}% del pool` : `${leadPrediction.percent}% of pool`;
  const backedText = isSpanish() ? `${formatNumber(duel.pools.totalSignal)} SIGNAL respaldado` : `${formatNumber(duel.pools.totalSignal)} SIGNAL backed`;
  const leadText = hasPredictionA || hasPredictionB
    ? isSpanish()
      ? `${leadPrediction.agent.name} lidera ${leadPrediction.prediction.confidence}% contra ${trailingPrediction.prediction.confidence}% de confianza`
      : `${leadPrediction.agent.name} leads ${leadPrediction.prediction.confidence}% to ${trailingPrediction.prediction.confidence}% confidence`
    : t("officialPredictionPending");

  return `
    <a class="duel-card duel-card-link" href="./duel.html?id=${duel.id}" data-instance="${instanceIndex}">
      <div class="card-meta">
        <div class="leaderboard-meta">
          <span class="status-pill ${status.className}">${status.label}</span>
          <span class="badge subtle-badge">${hasPredictionA || hasPredictionB ? t("predictionLocked") : t("awaitingSubmissions")}</span>
        </div>
        <span class="metric-label">${translateArenaTag(duel.liveSignal)}</span>
      </div>
      <h3>${duel.title}</h3>
      <div class="duel-bots">
        <div class="bot-line">
          ${avatarMarkup(agentA, "small")}
          <div>
            <strong>${agentA.name}</strong>
            <div class="metric-label">${predictionA.provider} / ${predictionA.model}</div>
          </div>
        </div>
        <div class="bot-line">
          ${avatarMarkup(agentB, "small")}
          <div>
            <strong>${agentB.name}</strong>
            <div class="metric-label">${predictionB.provider} / ${predictionB.model}</div>
          </div>
        </div>
      </div>
      <p>${truncateText(duel.prompt, 96)}</p>
      <div class="duel-card-signal">
        <div>
          <span class="metric-label">${hasPredictionA || hasPredictionB ? t("liveConfidence") : t("submissionStatus")}</span>
          <strong>${hasPredictionA || hasPredictionB ? `${leadPrediction.agent.name} ${leadPrediction.prediction.confidence}%` : t("noOfficialCallYet")}</strong>
        </div>
        <div>
          <span class="metric-label">${t("homeMostBacked")}</span>
          <strong>${percentOfPoolText}</strong>
        </div>
      </div>
      <div class="outcome-book">
        <div class="outcome-row ${leadPrediction.agent.id === agentA.id ? "is-leading" : ""}">
          <span>${agentA.name}</span>
          <strong>${predictionA.predictionValue} · ${predictionA.confidence}%</strong>
        </div>
        <div class="outcome-row ${leadPrediction.agent.id === agentB.id ? "is-leading" : ""}">
          <span>${agentB.name}</span>
          <strong>${predictionB.predictionValue} · ${predictionB.confidence}%</strong>
        </div>
      </div>
      <div class="duel-card-teaser">
        <span class="metric-label">${truncateText(leadPrediction.prediction.shortReasoning, 82)}</span>
      </div>
      <div class="split-bar"><div class="split-fill" style="width: ${duel.pools.agentAPercent}%"></div></div>
      <div class="card-footer">
        <div class="metric-copy">${leadText}</div>
        <div class="metric-label">${backedText}</div>
      </div>
    </a>
  `;
}

export function duelMarketRowMarkup(agent, duel, position, selected, slotLabel) {
  const percent = agent.id === duel.agentAId ? duel.pools.agentAPercent : duel.pools.agentBPercent;
  const signal = agent.id === duel.agentAId ? duel.pools.agentASignal : duel.pools.agentBSignal;
  const selectedLabel = position?.selectedAgentId === agent.id
    ? (isSpanish() ? "Tu lado" : "Your side")
    : selected
      ? (isSpanish() ? "Lado sugerido" : "Suggested side")
      : (isSpanish() ? "En juego" : "In play");
  const prediction = duel.predictions.byAgentId[agent.id];
  const published = hasOfficialPrediction(prediction);
  const backingText = isSpanish() ? `${percent}% del respaldo` : `${percent}% of backing`;

  return `
    <div class="duel-market-row ${selected ? "is-selected" : ""}">
      <div class="duel-market-agent">
        ${avatarMarkup(agent, "large")}
        <div>
          <div class="duel-market-label">${slotLabel}</div>
          <strong>${agent.name}</strong>
          <div class="metric-label">${agent.provider} / ${agent.model} · ${translateArenaTag(agent.statusTag)}</div>
        </div>
      </div>
      <div class="duel-market-stats">
        <div>
          <span>${isSpanish() ? "Predicción" : "Prediction"}</span>
          <strong>${prediction.predictionValue} · ${prediction.confidence}%</strong>
        </div>
        <div>
          <span>Provider</span>
          <strong>${prediction.provider} / ${prediction.model}</strong>
        </div>
        <div>
          <span>${isSpanish() ? "Historial" : "Track record"}</span>
          <strong>${agent.record.wins}W - ${agent.record.losses}L</strong>
        </div>
      </div>
      <div class="metric-label">${published ? prediction.predictionLabel : t("officialPredictionPending")}</div>
      <div class="metric-label">${truncateText(prediction.shortReasoning, 120)}</div>
      <div class="duel-market-stats">
        <div>
          <span>${selectedLabel}</span>
          <strong>${backingText}</strong>
        </div>
        <div>
          <span>Pool</span>
          <strong>${formatNumber(signal)} SIGNAL</strong>
        </div>
      </div>
    </div>
  `;
}

export function choiceMarkup(agent, percent, position, forceSelected = false) {
  const selected = position?.selectedAgentId === agent.id || forceSelected ? "selected" : "";
  return `<div class="choice-button ${selected}" data-agent-id="${agent.id}"><span>${agent.name}</span><strong>${percent}%</strong></div>`;
}

export function relatedDuelMarkup(duel, agentsById) {
  const agentA = agentsById[duel.agentAId];
  const agentB = agentsById[duel.agentBId];
  return `
    <a class="duel-related-item" href="./duel.html?id=${duel.id}">
      <div>
        <strong>${duel.prompt}</strong>
        <span>${agentA.name} ${duel.pools.agentAPercent}% · ${agentB.name} ${duel.pools.agentBPercent}%</span>
      </div>
      <span>${formatTimeLeft(duel.timing.timeLeftLabel)}</span>
    </a>
  `;
}

export function detailBotMarkup(agent, percent) {
  return `
    <div class="bot-panel">
      <div class="bot-line">
        ${avatarMarkup(agent, "large")}
        <div>
          <strong>${agent.name}</strong>
          <div class="metric-label">${translateCategory(agent.category)}</div>
        </div>
      </div>
      <h3>${isSpanish() ? `${percent}% del pool` : `${percent}% of pool`}</h3>
      <p>${agent.tagline}</p>
      <div class="stats-row"><span class="metric-label">${t("record")}</span><strong>${agent.record.wins}W - ${agent.record.losses}L</strong></div>
    </div>
  `;
}

export function buildExploreDisplayDuels(duels, targetCount) {
  return duels.slice(0, targetCount);
}
