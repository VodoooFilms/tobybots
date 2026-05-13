// render.js — UI rendering functions
import { appState, page, CHAIN, getStatusMap, getPositionMap } from "./state.js?v=3";
import {
  formatNumber, formatTimeLeft, formatIso,
  summaryMetric, overviewCardMarkup, activityMarkup, positionMarkup,
  agentCardMarkup, miniDuelRowMarkup, duelCardMarkup, buildExploreDisplayDuels,
  duelMarketRowMarkup, choiceMarkup, relatedDuelMarkup,
  duelCountdownParts, countdownMarkup, translateCategory, translateOrigin,
  actionHeading, actionDescription, actionButton, summaryLine, avatarMarkup, hasOfficialPrediction
} from "./utils.js?v=3";
import { t, getLanguage } from "./i18n.js?v=3";
import { connectWallet, bindDuelInteractions } from "./wallet.js?v=3";

const isSpanish = () => getLanguage() === "es";

function translateArenaTag(value) {
  if (!isSpanish()) return value;
  return {
    "Confidence locked": "Confianza bloqueada",
    "Prediction live": "Predicción en vivo",
    "New prediction submitted": "Nueva predicción enviada",
    "Hot streak": "Racha caliente",
    "Pool shifted": "Pool movido",
    "Top predictor": "Mejor predictor",
    Contrarian: "Contrarian",
    "Hot agent": "Agente caliente",
    "Won 2 of last 3": "Ganó 2 de las últimas 3",
    "Needs a bounce-back call": "Necesita una llamada de rebote",
    "Three-call heater": "Tres aciertos seguidos"
  }[value] || value;
}

// ─── Wallet summary ────────────────────────────────────────────

export function setWalletSummary(viewer) {
  const wallet = document.getElementById("wallet-summary");
  if (!wallet) return;
  wallet.innerHTML = appState.account
    ? `<span class="wallet-pill-inner"><img class="wallet-pill-icon" src="./tobybots-img/signalcoin_image.png" alt="" aria-hidden="true" /><span>${formatNumber(viewer.signalBalance)} SIGNAL</span></span>`
    : t("walletConnect");
  wallet.style.cursor = "pointer";
  wallet.onclick = () => (appState.account ? window.location.assign("./portfolio.html") : connectWallet());
}

// ─── Nav state ─────────────────────────────────────────────────

export function setNavState(current) {
  const navMap = { arena: "arena", explore: "explore", duel: "explore", agent: "agents", portfolio: "portfolio" };
  document.querySelectorAll(".nav a").forEach((item) => item.classList.remove("active"));
  const navKey = navMap[current];
  if (!navKey) return;
  const link = document.querySelector(`[data-nav="${navKey}"]`);
  if (link) link.classList.add("active");
}

// ─── Home ──────────────────────────────────────────────────────

export function renderArena(data, agentsById) {
  const statusMap = getStatusMap();
  const featuredDuels = data.meta.featuredDuelIds
    .map((id) => data.duels.find((duel) => duel.id === id))
    .filter(Boolean);
  const topAgents = [...data.agents]
    .sort((a, b) => b.record.winRate - a.record.winRate || b.record.wins - a.record.wins || b.stats.totalBackedSignal - a.stats.totalBackedSignal)
    .slice(0, 4);
  const heroDuel = featuredDuels[0];
  const hero = document.getElementById("hero");
  hero.innerHTML = `
    <div class="hero-copy">
      <p class="eyebrow">${t("homeHeroEyebrow")}</p>
      <h1>${t("homeHeroTitle")}</h1>
      <p>${t("homeHeroBody1")}</p>
      <p class="metric-label">${t("homeHeroBody2")}</p>
      <div class="hero-pills">
        <span class="badge">${t("homeBadge1")}</span>
        <span class="badge">${t("homeBadge2")}</span>
        <span class="badge">${t("homeBadge3")}</span>
      </div>
      <div class="hero-actions">
        <a class="button primary" href="./index.html">${t("homePrimaryCta")}</a>
        <a class="button secondary" href="./agent.html?id=1">${t("homeSecondaryCta")}</a>
      </div>
    </div>
    <div class="hero-board">
      <div class="market-pulse">
        <div class="pulse-stack">
          <span class="metric-label">${t("homeFeaturedBattle")}</span>
          <strong>${heroDuel ? heroDuel.title : t("homeNoLiveBattles")}</strong>
          <span class="metric-label">${heroDuel ? `${formatNumber(heroDuel.pools.totalSignal)} SIGNAL ${isSpanish() ? "respaldado" : "backed"} · ${formatTimeLeft(heroDuel.timing.timeLeftLabel)}` : t("homeWaitingPredictions")}</span>
        </div>
        ${heroDuel ? `<span class="status-pill ${statusMap[heroDuel.status].className}">${statusMap[heroDuel.status].label}</span>` : ""}
      </div>
      <div class="mini-board">
        ${featuredDuels.map((duel) => miniDuelRowMarkup(duel, agentsById)).join("")}
      </div>
    </div>
  `;

  document.getElementById("arena-overview").innerHTML = `
    ${summaryMetric(t("homeLiveBattles"), data.duels.filter((duel) => duel.status === "open").length)}
    ${summaryMetric(t("homeTopPredictor"), topAgents[0] ? topAgents[0].name : "TBD")}
    ${summaryMetric(t("homeMostBacked"), `${formatNumber(data.duels.filter((duel) => duel.status === "open").reduce((sum, duel) => sum + duel.pools.totalSignal, 0))} SIGNAL`)}
    ${summaryMetric(t("homeLeaderboard"), t("homeAgentsTracked", { count: data.agents.length }))}
  `;

  document.getElementById("featured-duels").innerHTML = featuredDuels.map((duel) => duelCardMarkup(duel, agentsById)).join("");
  document.getElementById("top-agents").innerHTML = topAgents.map((agent, index) => agentCardMarkup(agent, { rank: index + 1, featured: true })).join("");
  document.getElementById("activity-feed").innerHTML = data.activities.length
    ? data.activities.slice(0, 5).map(activityMarkup).join("")
    : `<div class="activity-row"><span>${t("noRecentOnchain")}</span><span>${t("now")}</span></div>`;
}

// ─── Explore ───────────────────────────────────────────────────

export function renderExplore(data, agentsById) {
  const statusFilter = document.getElementById("status-filter");
  const searchFilter = document.getElementById("search-filter");
  const grid = document.getElementById("explore-grid");
  const empty = document.getElementById("explore-empty");
  const overview = document.getElementById("market-overview");

  overview.innerHTML = `
    ${overviewCardMarkup(isSpanish() ? "Duelos abiertos" : "Open duels", data.duels.filter((duel) => duel.status === "open").length, t("networkRead"))}
    ${overviewCardMarkup(isSpanish() ? "Duelos finalizados" : "Settled duels", data.duels.filter((duel) => duel.status === "settled").length, t("contractStatus"))}
    ${overviewCardMarkup(isSpanish() ? "Volumen total" : "Total volume", `${formatNumber(data.duels.reduce((sum, duel) => sum + duel.pools.totalSignal, 0))} SIGNAL`, "Sepolia live")}
    ${overviewCardMarkup(isSpanish() ? "Tus posiciones" : "Your positions", data.viewer.positions.length, appState.account ? t("walletConnected") : t("connectWalletShort"))}
  `;

  const rerender = () => {
    const status = statusFilter.value;
    const query = searchFilter.value.trim().toLowerCase();
    const filtered = data.duels.filter((duel) => {
      const agentA = agentsById[duel.agentAId];
      const agentB = agentsById[duel.agentBId];
      const matchesStatus = status === "all" || duel.status === status;
      const haystack = `${duel.title} ${duel.prompt} ${agentA.name} ${agentB.name}`.toLowerCase();
      return matchesStatus && (!query || haystack.includes(query));
    });

    const displayDuels = buildExploreDisplayDuels(filtered, 16);
    grid.innerHTML = displayDuels.map((duel, index) => duelCardMarkup(duel, agentsById, false, index)).join("");
    empty.classList.toggle("hidden", filtered.length > 0);
  };

  statusFilter.onchange = rerender;
  searchFilter.oninput = rerender;
  rerender();
}

// ─── Duel ──────────────────────────────────────────────────────

export function renderDuel(data, agentsById) {
  const statusMap = getStatusMap();
  const positionMap = getPositionMap();
  const params = new URLSearchParams(window.location.search);
  const duel = data.duels.find((item) => item.id === (params.get("id") || data.duels[0]?.id)) || data.duels[0];
  const agentA = agentsById[duel.agentAId];
  const agentB = agentsById[duel.agentBId];
  const predictionA = duel.predictions.byAgentId[agentA.id];
  const predictionB = duel.predictions.byAgentId[agentB.id];
  const predictionAPublished = hasOfficialPrediction(predictionA);
  const predictionBPublished = hasOfficialPrediction(predictionB);
  const position = duel.userPosition;
  const status = statusMap[duel.status];
  const view = document.getElementById("duel-view");
  const inputDisabled = duel.isSynthetic || duel.status !== "open" || !!position || !appState.account;
  const relatedDuels = data.duels.filter((item) => item.id !== duel.id).slice(0, 3);
  const countdown = duelCountdownParts(duel);
  const selectedAgentId = position?.selectedAgentId || agentA.id;
  const boardRows = [
    duelMarketRowMarkup(agentA, duel, position, selectedAgentId === agentA.id, "A"),
    duelMarketRowMarkup(agentB, duel, position, selectedAgentId === agentB.id, "B")
  ].join("");

  view.innerHTML = `
    <section class="duel-column duel-main-column">
      <article class="panel matchup-hero duel-market-hero">
        <div class="duel-hero-top">
          <div>
            <p class="eyebrow">Arena · ${CHAIN.name}</p>
            <div class="duel-breadcrumb">${translateCategory(agentA.category)} · ${agentA.name} vs ${agentB.name}</div>
            <h1>${duel.prompt}</h1>
            <div class="duel-hero-meta">
              <span class="status-pill ${status.className}">${status.label}</span>
              <span>${formatNumber(duel.pools.totalSignal)} SIGNAL ${isSpanish() ? "en pool" : "in pool"}</span>
              <span>${isSpanish() ? "Cierre apuestas" : "Bet close"} ${formatIso(duel.timing.betDeadlineIso)}</span>
            </div>
          </div>
          <div class="duel-countdown">
            ${countdownMarkup(countdown)}
          </div>
        </div>
      </article>

      <article class="panel duel-board-panel">
        <div class="duel-board-head">
          <div>
            <h2>${t("predictionBattle")}</h2>
            <p>${t("predictionBattleBody")}</p>
          </div>
          <div class="duel-board-meta">
            <span>Duel #${duel.id}</span>
            <span>${formatTimeLeft(duel.timing.timeLeftLabel)}</span>
          </div>
        </div>
        <div class="duel-board-rows">
          ${boardRows}
        </div>
      </article>

      <article class="panel detail-section duel-info-card">
        <h2>${t("officialSubmissions")}</h2>
        <div class="submission-grid">
          <article class="submission-card">
            <div class="submission-head">
              <div class="bot-line">
                ${avatarMarkup(agentA, "small")}
                <div>
                  <strong>${agentA.name}</strong>
                  <div class="metric-label">${predictionA.provider} / ${predictionA.model}</div>
                </div>
              </div>
              <span class="badge subtle-badge">${predictionAPublished ? translateArenaTag(agentA.heatTag || t("liveConfidence")) : (isSpanish() ? "Esperando submission" : "Awaiting submission")}</span>
            </div>
            <div class="submission-call">
              <span class="metric-label">${predictionAPublished ? t("predictionLocked") : t("submissionStatus")}</span>
              <strong>${predictionA.predictionValue} · ${predictionA.confidence}%</strong>
            </div>
            <div class="submission-meta">
              <span>${agentA.record.winRate}% ${t("winRate").toLowerCase()}</span>
              <span>${translateArenaTag(agentA.stats.streak)}</span>
            </div>
            <p class="metric-label">${predictionAPublished ? predictionA.predictionLabel : t("officialPredictionPending")}</p>
            <p>${predictionA.shortReasoning}</p>
          </article>
          <article class="submission-card">
            <div class="submission-head">
              <div class="bot-line">
                ${avatarMarkup(agentB, "small")}
                <div>
                  <strong>${agentB.name}</strong>
                  <div class="metric-label">${predictionB.provider} / ${predictionB.model}</div>
                </div>
              </div>
              <span class="badge subtle-badge">${predictionBPublished ? translateArenaTag(agentB.heatTag || (isSpanish() ? "Predicción en vivo" : "Prediction live")) : (isSpanish() ? "Esperando submission" : "Awaiting submission")}</span>
            </div>
            <div class="submission-call">
              <span class="metric-label">${predictionBPublished ? t("predictionLocked") : t("submissionStatus")}</span>
              <strong>${predictionB.predictionValue} · ${predictionB.confidence}%</strong>
            </div>
            <div class="submission-meta">
              <span>${agentB.record.winRate}% ${t("winRate").toLowerCase()}</span>
              <span>${translateArenaTag(agentB.stats.streak)}</span>
            </div>
            <p class="metric-label">${predictionBPublished ? predictionB.predictionLabel : t("officialPredictionPending")}</p>
            <p>${predictionB.shortReasoning}</p>
          </article>
        </div>
      </article>

      <section class="duel-info-grid">
        <article class="panel detail-section duel-info-card">
          <h2>${t("timingRules")}</h2>
          <div class="duel-rule-list">
            <div class="duel-rule-row"><span>${t("bettingWindow")}</span><strong>${isSpanish() ? "Hasta" : "Until"} ${formatIso(duel.timing.betDeadlineIso)}</strong></div>
            <div class="duel-rule-row"><span>${t("settlementWindow")}</span><strong>${isSpanish() ? "Hasta" : "Until"} ${formatIso(duel.timing.settleDeadlineIso)}</strong></div>
            <div class="duel-rule-row"><span>${t("refunds")}</span><strong>${t("refundsRule")}</strong></div>
            <div class="duel-rule-row"><span>${t("restriction")}</span><strong>${t("restrictionRule")}</strong></div>
          </div>
        </article>

        <article class="panel detail-section duel-info-card">
          <h2>${t("duelActivity")}</h2>
          <div class="activity-list">
            ${data.activities.filter((activity) => activity.duelId === duel.id).slice(0, 4).map(activityMarkup).join("") || `<div class="activity-row"><span>${t("noRecentVisible")}</span><span>${t("now")}</span></div>`}
          </div>
        </article>
      </section>
    </section>
    <aside class="panel action-panel duel-trade-panel">
      <p class="eyebrow">${isSpanish() ? "Respalda esta predicción" : "Back this prediction"}</p>
      <h3>${actionHeading(duel, position, agentA, agentB)}</h3>
      <p>${actionDescription(duel, position)}</p>
      <div class="action-state">
        <div class="trade-market-header">
          <span>${isSpanish() ? "Panel de respaldo" : "Backing panel"}</span>
          <strong>${duel.status === "open" ? statusMap.open.label : status.label}</strong>
        </div>
        <div class="choice-grid duel-choice-grid">
          ${choiceMarkup(agentA, duel.pools.agentAPercent, position, !position)}
          ${choiceMarkup(agentB, duel.pools.agentBPercent, position, false)}
        </div>
        <label class="trade-field">
          <span>${t("amountSignal")}</span>
          <input id="bet-amount-input" type="number" min="1" step="1" value="${position?.amountSignal || 250}" ${inputDisabled ? "disabled" : ""} />
        </label>
        <div class="quick-amounts">
          <button type="button" class="quick-amount-button" data-amount="25" ${inputDisabled ? "disabled" : ""}>+25</button>
          <button type="button" class="quick-amount-button" data-amount="100" ${inputDisabled ? "disabled" : ""}>+100</button>
          <button type="button" class="quick-amount-button" data-amount="250" ${inputDisabled ? "disabled" : ""}>+250</button>
          <button type="button" class="quick-amount-button" data-amount="500" ${inputDisabled ? "disabled" : ""}>+500</button>
        </div>
        <div class="action-summary">
          ${summaryLine(t("balance"), `${formatNumber(data.viewer.signalBalance)} SIGNAL`)}
          ${summaryLine(t("state"), position ? positionMap[position.status].label : status.label)}
          ${summaryLine(t("totalPool"), `${formatNumber(duel.pools.totalSignal)} SIGNAL`)}
          ${position?.claimableSignal ? summaryLine(t("winnings"), `${formatNumber(position.claimableSignal)} SIGNAL`) : ""}
          ${position?.refundSignal ? summaryLine(t("refund"), `${formatNumber(position.refundSignal)} SIGNAL`) : ""}
        </div>
        <button id="duel-action-button" class="button primary">${actionButton(duel, position)}</button>
      </div>
      <div class="duel-side-stack">
        <div class="duel-side-section">
          <h4>${t("yourQuickRead")}</h4>
          <div class="duel-side-copy">
            <span>${agentA.name}</span>
            <strong>${isSpanish() ? `${duel.pools.agentAPercent}% del pool` : `${duel.pools.agentAPercent}% of pool`}</strong>
          </div>
          <div class="duel-side-copy">
            <span>${agentB.name}</span>
            <strong>${isSpanish() ? `${duel.pools.agentBPercent}% del pool` : `${duel.pools.agentBPercent}% of pool`}</strong>
          </div>
        </div>
        <div class="duel-side-section">
          <h4>${t("otherDuels")}</h4>
          <div class="duel-related-list">
            ${relatedDuels.map((item) => relatedDuelMarkup(item, agentsById)).join("")}
          </div>
        </div>
      </div>
    </aside>
  `;

  bindDuelInteractions(duel, position, agentA);
}

// ─── Agent ─────────────────────────────────────────────────────

export function renderAgent(data, agentsById) {
  const params = new URLSearchParams(window.location.search);
  const agent = data.agents.find((item) => item.id === (params.get("id") || data.agents[0].id)) || data.agents[0];
  const duels = data.duels.filter((duel) => duel.agentAId === agent.id || duel.agentBId === agent.id);
  const activities = data.activities.filter((activity) => activity.label.includes(agent.name));
  const view = document.getElementById("agent-view");

  view.innerHTML = `
    <section class="panel agent-hero">
      <div class="agent-meta">
        ${avatarMarkup(agent, "large")}
        <div>
          <p class="eyebrow">${translateOrigin(agent.origin)}</p>
          <h1>${agent.name}</h1>
          <div class="card-matchup">
            <span class="badge">${translateCategory(agent.category)}</span>
            ${agent.verified ? `<span class="badge">${t("agentVerified")}</span>` : `<span class="badge">${t("agentUnverified")}</span>`}
            <span class="badge">${agent.provider} / ${agent.model}</span>
            <span class="badge">${translateArenaTag(agent.statusTag)}</span>
          </div>
          <p>${agent.tagline}</p>
        </div>
      </div>
      <div class="hero-actions">
        <a class="button primary" href="./index.html">${t("viewDuels")}</a>
        <a class="button secondary" href="./duel.html?id=${duels[0]?.id || ""}">${t("openDuel")}</a>
      </div>
    </section>

    <section class="summary-grid">
      ${summaryMetric(t("wins"), agent.record.wins)}
      ${summaryMetric(t("losses"), agent.record.losses)}
      ${summaryMetric(t("winRate"), `${agent.record.winRate}%`)}
      ${summaryMetric(t("recentForm"), agent.stats.recentForm)}
    </section>

    <section class="panel detail-section">
      <h2>${t("aboutAgent")}</h2>
      <p><strong>${t("specialty")}:</strong> ${agent.specialty}</p>
      <p><strong>${t("providerModel")}:</strong> ${agent.provider} / ${agent.model}</p>
      <p><strong>${t("origin")}:</strong> ${translateOrigin(agent.origin)}</p>
      <p><strong>${t("recentForm")}:</strong> ${agent.stats.recentForm}</p>
      <p><strong>${t("currentStreak")}:</strong> ${translateArenaTag(agent.stats.streak)}</p>
      <p><strong>${t("predictionsTracked")}:</strong> ${agent.stats.totalPredictions}</p>
      <p><strong>${t("openDuelsCount")}:</strong> ${agent.stats.activeDuels}</p>
      <p><strong>${t("totalBackedLabel")}:</strong> ${formatNumber(agent.stats.totalBackedSignal)} SIGNAL</p>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>${t("recentDuels")}</h2>
      </div>
      <div class="card-grid">${duels.map((duel) => duelCardMarkup(duel, agentsById)).join("")}</div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>${t("recentActivity")}</h2>
      </div>
      <div class="activity-list panel">${activities.length ? activities.map(activityMarkup).join("") : `<div class="activity-row"><span>${t("noRecentVisible")}</span><span>${t("now")}</span></div>`}</div>
    </section>
  `;
}

// ─── Portfolio ─────────────────────────────────────────────────

export function renderPortfolio(data) {
  const grouped = {
    open: data.viewer.positions.filter((position) => position.status === "active"),
    winnings: data.viewer.positions.filter((position) => position.status === "won_claim_available"),
    refunds: data.viewer.positions.filter((position) => position.status === "refund_available"),
    history: data.viewer.positions.filter((position) => !["active", "won_claim_available", "refund_available"].includes(position.status))
  };

  const view = document.getElementById("portfolio-view");
  view.innerHTML = `
    <section class="portfolio-header">
      <article class="panel page-intro">
        <p class="eyebrow">${t("arenaHistory")}</p>
        <h1>${t("managePositions")}</h1>
        <p>${data.viewer.walletAddress || t("walletConnect")}</p>
      </article>
      <div class="summary-grid">
        ${summaryMetric(t("signalBalance"), `${formatNumber(data.viewer.signalBalance)} SIGNAL`)}
        ${summaryMetric(t("totalBacked"), `${formatNumber(data.viewer.summary.totalBackedSignal)} SIGNAL`)}
        ${summaryMetric(t("claimableWinnings"), `${formatNumber(data.viewer.summary.claimableSignal)} SIGNAL`)}
        ${summaryMetric(t("claimableRefunds"), `${formatNumber(data.viewer.summary.refundableSignal)} SIGNAL`)}
      </div>
    </section>

    <section class="panel portfolio-card">
      <div class="tabs">
        <button class="tab active" data-tab="open">${t("openPositions")}</button>
        <button class="tab" data-tab="winnings">${t("claimWinningsTab")}</button>
        <button class="tab" data-tab="refunds">${t("claimRefundsTab")}</button>
        <button class="tab" data-tab="history">${t("historyTab")}</button>
      </div>
      <div id="tab-content"></div>
    </section>
  `;

  const tabContent = document.getElementById("tab-content");
  const tabs = [...document.querySelectorAll(".tab")];
  const renderTab = (key) => {
    tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === key));
    const rows = grouped[key];
    tabContent.innerHTML = rows.length
      ? `<div class="positions-grid">${rows.map(positionMarkup).join("")}</div>`
      : `<div class="empty-state"><h3>${t("noSectionMoves")}</h3><p>${appState.account ? t("noSectionWithWallet") : t("noSectionWithoutWallet")}</p></div>`;
  };

  tabs.forEach((tab) => tab.addEventListener("click", () => renderTab(tab.dataset.tab)));
  renderTab("open");
}
