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
  if (duel.status === "open" && !position) return "Respalda un bot";
  if (position?.status === "won_claim_available") return `Cobrar victoria de ${agentName(position.selectedAgentId, agentA, agentB)}`;
  if (position?.status === "refund_available") return "Cobrar reembolso";
  if (duel.status === "refund_available" && !position) return "Abrir refunds";
  return "Duelo cerrado";
}

export function actionDescription(duel, position) {
  if (!duel._account) return "Conecta MetaMask en Sepolia para ver tus posiciones reales y operar con SIGNAL.";
  if (duel.status === "open" && !position) return "Aprueba SIGNAL, elige un lado y entra al duelo antes del cierre.";
  if (position?.status === "won_claim_available") return "Esta posición ganó. Tu payout ya está listo para cobrar.";
  if (position?.status === "refund_available") return "Este duelo expiró sin veredicto. Tu apuesta original puede volver a tu wallet.";
  if (duel.status === "refund_available" && !position) return "El duelo venció sin settlement. Cualquier wallet puede desbloquear refunds.";
  if (duel.status === "settled") return "El ganador ya fue declarado. Los backers ganadores pueden cobrar y los demás revisar el resultado.";
  return "Este duelo quedó cerrado para reembolsos individuales.";
}

export function actionButton(duel, position) {
  if (!duel._account) return "Conectar billetera";
  if (duel.status === "open" && !position) return "Aprobar y respaldar";
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

export function agentCardMarkup(agent) {
  return `
    <article class="agent-card">
      <div class="avatar large">${initials(agent.name)}</div>
      <h3>${agent.name}</h3>
      <span class="badge">${translateCategory(agent.category)}</span>
      <p>${agent.specialty}</p>
      <div class="stats-row"><span class="metric-label">Récord</span><strong>${agent.record.wins}W - ${agent.record.losses}L</strong></div>
      <div class="stats-row"><span class="metric-label">Respaldado</span><strong>${formatNumber(agent.stats.totalBackedSignal)} SIGNAL</strong></div>
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
        <span>${agentA.name} ${duel.pools.agentAPercent}% · ${agentB.name} ${duel.pools.agentBPercent}%</span>
      </div>
      <span>${formatTimeLeft(duel.timing.timeLeftLabel)}</span>
    </a>
  `;
}

export function duelCardMarkup(duel, agentsById, compact = false, instanceIndex = 0) {
  const agentA = agentsById[duel.agentAId];
  const agentB = agentsById[duel.agentBId];
  const status = statusMap[duel.status];
  return `
    <a class="duel-card duel-card-link" href="./duel.html?id=${duel.id}" data-instance="${instanceIndex}">
      <div class="card-meta">
        <span class="status-pill ${status.className}">${status.label}</span>
        <span class="metric-label">${formatTimeLeft(duel.timing.timeLeftLabel)}</span>
      </div>
      <h3>${duel.title}</h3>
      <div class="duel-bots">
        <div class="bot-line">
          <span class="avatar">${initials(agentA.name)}</span>
          <div>
            <strong>${agentA.name}</strong>
            <div class="metric-label">${translateCategory(agentA.category)}</div>
          </div>
        </div>
        <div class="bot-line">
          <span class="avatar">${initials(agentB.name)}</span>
          <div>
            <strong>${agentB.name}</strong>
            <div class="metric-label">${translateCategory(agentB.category)}</div>
          </div>
        </div>
      </div>
      <p>${duel.prompt}</p>
      <div class="outcome-book">
        <div class="outcome-row">
          <span>${agentA.name}</span>
          <strong>${duel.pools.agentAPercent}%</strong>
        </div>
        <div class="outcome-row">
          <span>${agentB.name}</span>
          <strong>${duel.pools.agentBPercent}%</strong>
        </div>
      </div>
      <div class="split-bar"><div class="split-fill" style="width: ${duel.pools.agentAPercent}%"></div></div>
      <div class="trade-actions">
        <span class="trade-button yes">${compact ? "Abrir" : agentA.name}</span>
        <span class="trade-button no">${compact ? "Ver duelo" : agentB.name}</span>
      </div>
      <div class="card-footer">
        <div class="metric-copy">Pool ${formatNumber(duel.pools.totalSignal)} SIGNAL</div>
        <div class="metric-label">${duel.result.winnerDeclaredLabel ? `Ganó ${duel.result.winnerDeclaredLabel}` : "Sepolia live"}</div>
      </div>
    </a>
  `;
}

export function duelMarketRowMarkup(agent, duel, position, selected, slotLabel) {
  const percent = agent.id === duel.agentAId ? duel.pools.agentAPercent : duel.pools.agentBPercent;
  const signal = agent.id === duel.agentAId ? duel.pools.agentASignal : duel.pools.agentBSignal;
  const selectedLabel = position?.selectedAgentId === agent.id ? "Tu lado" : selected ? "Lado sugerido" : "En juego";

  return `
    <div class="duel-market-row ${selected ? "is-selected" : ""}">
      <div class="duel-market-agent">
        <span class="avatar large">${initials(agent.name)}</span>
        <div>
          <div class="duel-market-label">${slotLabel}</div>
          <strong>${agent.name}</strong>
          <div class="metric-label">${agent.tagline}</div>
        </div>
      </div>
      <div class="duel-market-stats">
        <div>
          <span>${selectedLabel}</span>
          <strong>${percent}% del pool</strong>
        </div>
        <div>
          <span>Pool</span>
          <strong>${formatNumber(signal)} SIGNAL</strong>
        </div>
        <div>
          <span>Récord</span>
          <strong>${agent.record.wins}W - ${agent.record.losses}L</strong>
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
        <span class="avatar large">${initials(agent.name)}</span>
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
