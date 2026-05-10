// utils.js — pure helper functions (formatting, math, markup generation)
import { ethers } from "https://esm.sh/ethers@6.13.5";
import { statusMap, positionMap, CHAIN } from "./state.js";

// ─── Formatting ────────────────────────────────────────────────

export function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Math.round(value * 100) / 100);
}

export function formatTokenNumber(value) {
  return Number(ethers.formatEther(value));
}

export function formatIso(value) {
  return new Intl.DateTimeFormat("es-EC", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function formatPredictionTimestamp(value) {
  if (!value) return "Pending";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function relativeTimestamp(value) {
  const diffMinutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (diffMinutes < 60) return `hace ${diffMinutes} min`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `hace ${diffHours} h`;
  return `hace ${Math.round(diffHours / 24)} d`;
}

export function formatTimeLeft(value) {
  if (value === "Settled") return "Finalizado";
  if (value === "Winner declared") return "Ganador declarado";
  if (value === "Refund available") return "Reembolso disponible";
  if (value.includes("left")) return value.replace(" left", " restantes");
  return value;
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
  // Use integer math matching Solidity: prizePool = totalPot - (totalPot * ARENA_CUT / 10000)
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
  if (now <= settleDeadline) return "Esperando veredicto";
  return "Refund available";
}

export function duelCountdownParts(duel) {
  if (duel.status !== "open") {
    return [
      { value: "--", label: "hrs" },
      { value: "--", label: "mins" },
      { value: "--", label: "secs" }
    ];
  }
  const diff = Math.max(0, new Date(duel.timing.betDeadlineIso).getTime() - Date.now());
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [
    { value: String(hours).padStart(2, "0"), label: "hrs" },
    { value: String(minutes).padStart(2, "0"), label: "mins" },
    { value: String(seconds).padStart(2, "0"), label: "secs" }
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
  return {
    "Guest Agent": "Agente invitado",
    "Partner Agent": "Agente partner",
    "Community Agent": "Agente comunidad",
    "Toby Original": "Original Toby"
  }[value] || value;
}

export function translateOrigin(value) {
  return {
    External: "Invitado",
    Partner: "Partner",
    Community: "Comunidad",
    Toby: "Toby"
  }[value] || value;
}

// ─── Action labels ─────────────────────────────────────────────

export function actionHeading(duel, position, agentA, agentB) {
  if (!duel._account) return "Conecta tu wallet";
  if (duel.status === "open" && !position) return "Back the agent you trust";
  if (position?.status === "won_claim_available") return `Cobrar victoria de ${agentName(position.selectedAgentId, agentA, agentB)}`;
  if (position?.status === "refund_available") return "Cobrar reembolso";
  if (duel.status === "refund_available" && !position) return "Abrir refunds";
  return "Duelo cerrado";
}

export function actionDescription(duel, position) {
  if (!duel._account) return "Conecta MetaMask en Sepolia para ver tus posiciones reales y operar con SIGNAL.";
  if (duel.status === "open" && !position) return "Review each submission, compare confidence and track record, then back the forecast you trust.";
  if (position?.status === "won_claim_available") return "Esta posición ganó. Tu payout ya está listo para cobrar.";
  if (position?.status === "refund_available") return "Este duelo expiró sin veredicto. Tu apuesta original puede volver a tu wallet.";
  if (duel.status === "refund_available" && !position) return "El duelo venció sin settlement. Cualquier wallet puede desbloquear refunds.";
  if (duel.status === "settled") return "El ganador ya fue declarado. Los backers ganadores pueden cobrar y los demás revisar el resultado.";
  return "Este duelo quedó cerrado para reembolsos individuales.";
}

export function actionButton(duel, position) {
  if (!duel._account) return "Conectar billetera";
  if (duel.status === "open" && !position) return "Back this prediction";
  if (position?.status === "won_claim_available") return "Cobrar ganancia";
  if (position?.status === "refund_available") return "Cobrar reembolso";
  if (duel.status === "refund_available" && !position) return "Abrir refunds";
  if (duel.status === "open" && position) return "Ya participas";
  return "Ver portfolio";
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
  return `
    <article class="overview-card panel">
      <div class="overview-card-body">
        <span class="metric-label">${label}</span>
        <strong>${value}</strong>
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
  const state = positionMap[position.status];
  const action = position.status === "won_claim_available" ? "Cobrar ganancia" : position.status === "refund_available" ? "Cobrar reembolso" : "Ver duelo";
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
  const cueLabel = agent.heatTag || agent.statusTag;
  const liveLabel = agent.stats.activeDuels ? `${agent.stats.activeDuels} live duel${agent.stats.activeDuels === 1 ? "" : "s"}` : agent.stats.aliveSignal;
  return `
    <article class="agent-card${featured ? " featured-leaderboard-card" : ""}${prestigeClass}">
      <div class="card-meta">
        <div class="leaderboard-meta">
          ${rank ? `<span class="leaderboard-rank">#${rank}</span>` : `<span class="status-pill status-open">${agent.statusTag}</span>`}
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
        <div><span class="metric-label">Win rate</span><strong>${agent.record.winRate}%</strong></div>
        <div><span class="metric-label">Record</span><strong>${agent.record.wins}-${agent.record.losses}</strong></div>
        <div><span class="metric-label">Most backed</span><strong>${formatNumber(agent.stats.totalBackedSignal)} SIGNAL</strong></div>
      </div>
      <div class="agent-form-row">
        <div>
          <span class="metric-label">Recent form</span>
          ${recentFormMarkup(agent.stats.recentForm)}
        </div>
        <div class="metric-copy">${agent.stats.streak}</div>
      </div>
      <div class="card-footer">
        <div class="metric-label">Trending predictor</div>
        <div class="metric-label">${agent.statusTag}</div>
      </div>
      <a class="button secondary" href="./agent.html?id=${agent.id}">Ver perfil</a>
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
        <span>${duel.liveSignal} · ${agentA.name} ${duel.predictions.byAgentId[agentA.id].confidence}% · ${agentB.name} ${duel.predictions.byAgentId[agentB.id].confidence}%</span>
      </div>
      <span>${formatTimeLeft(duel.timing.timeLeftLabel)}</span>
    </a>
  `;
}

export function duelCardMarkup(duel, agentsById, compact = false, instanceIndex = 0) {
  const agentA = agentsById[duel.agentAId];
  const agentB = agentsById[duel.agentBId];
  const status = statusMap[duel.status];
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
  return `
    <a class="duel-card duel-card-link" href="./duel.html?id=${duel.id}" data-instance="${instanceIndex}">
      <div class="card-meta">
        <div class="leaderboard-meta">
          <span class="status-pill ${status.className}">${status.label}</span>
          <span class="badge subtle-badge">${hasPredictionA || hasPredictionB ? "Prediction locked" : "Awaiting submissions"}</span>
        </div>
        <span class="metric-label">${duel.liveSignal}</span>
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
          <span class="metric-label">${hasPredictionA || hasPredictionB ? "Live confidence" : "Submission status"}</span>
          <strong>${hasPredictionA || hasPredictionB ? `${leadPrediction.agent.name} ${leadPrediction.prediction.confidence}%` : "No official call yet"}</strong>
        </div>
        <div>
          <span class="metric-label">Most backed</span>
          <strong>${leadPrediction.percent}% of pool</strong>
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
        <div class="metric-copy">${hasPredictionA || hasPredictionB ? `${leadPrediction.agent.name} leads ${leadPrediction.prediction.confidence}% to ${trailingPrediction.prediction.confidence}% confidence` : "Official submissions pending"}</div>
        <div class="metric-label">${formatNumber(duel.pools.totalSignal)} SIGNAL backed</div>
      </div>
    </a>
  `;
}

export function duelMarketRowMarkup(agent, duel, position, selected, slotLabel) {
  const percent = agent.id === duel.agentAId ? duel.pools.agentAPercent : duel.pools.agentBPercent;
  const signal = agent.id === duel.agentAId ? duel.pools.agentASignal : duel.pools.agentBSignal;
  const selectedLabel = position?.selectedAgentId === agent.id ? "Tu lado" : selected ? "Lado sugerido" : "En juego";
  const prediction = duel.predictions.byAgentId[agent.id];
  const published = hasOfficialPrediction(prediction);

  return `
    <div class="duel-market-row ${selected ? "is-selected" : ""}">
      <div class="duel-market-agent">
        ${avatarMarkup(agent, "large")}
        <div>
          <div class="duel-market-label">${slotLabel}</div>
          <strong>${agent.name}</strong>
          <div class="metric-label">${agent.provider} / ${agent.model} · ${agent.statusTag}</div>
        </div>
      </div>
      <div class="duel-market-stats">
        <div>
          <span>Prediction</span>
          <strong>${prediction.predictionValue} · ${prediction.confidence}%</strong>
        </div>
        <div>
          <span>Provider</span>
          <strong>${prediction.provider} / ${prediction.model}</strong>
        </div>
        <div>
          <span>Track record</span>
          <strong>${agent.record.wins}W - ${agent.record.losses}L</strong>
        </div>
      </div>
      <div class="metric-label">${published ? prediction.predictionLabel : "Official prediction pending."}</div>
      <div class="metric-label">${truncateText(prediction.shortReasoning, 120)}</div>
      <div class="duel-market-stats">
        <div>
          <span>${selectedLabel}</span>
          <strong>${percent}% of backing</strong>
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
      <h3>${percent}% del pool</h3>
      <p>${agent.tagline}</p>
      <div class="stats-row"><span class="metric-label">Récord</span><strong>${agent.record.wins}W - ${agent.record.losses}L</strong></div>
    </div>
  `;
}

export function buildExploreDisplayDuels(duels, targetCount) {
  // Show real duels only — never duplicate. If fewer than targetCount, show what we have.
  return duels.slice(0, targetCount);
}
