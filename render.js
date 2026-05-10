// render.js — UI rendering functions
import { appState, page, CHAIN, statusMap, positionMap } from "./state.js";
import {
  formatNumber, formatTimeLeft, formatIso, initials,
  summaryMetric, overviewCardMarkup, activityMarkup, positionMarkup,
  agentCardMarkup, miniDuelRowMarkup, duelCardMarkup, buildExploreDisplayDuels,
  duelMarketRowMarkup, choiceMarkup, relatedDuelMarkup, detailBotMarkup,
  duelCountdownParts, countdownMarkup, translateCategory, translateOrigin,
  actionHeading, actionDescription, actionButton, summaryLine, avatarMarkup, hasOfficialPrediction
} from "./utils.js";
import { connectWallet, bindDuelInteractions } from "./wallet.js";

// ─── Wallet summary ────────────────────────────────────────────

export function setWalletSummary(user) {
  const wallet = document.getElementById("wallet-summary");
  if (!wallet) return;
  wallet.textContent = appState.account ? `${formatNumber(user.signalBalance)} SIGNAL` : "Conectar billetera";
  wallet.style.cursor = "pointer";
  wallet.onclick = () => (appState.account ? window.location.assign("./portfolio.html") : connectWallet());
}

// ─── Nav state ─────────────────────────────────────────────────

export function setNavState(current) {
  const navMap = { home: "home", explore: "explore", duel: "explore", agent: "agents", portfolio: "portfolio" };
  const navKey = navMap[current];
  if (!navKey) return;
  const link = document.querySelector(`[data-nav="${navKey}"]`);
  if (link) link.classList.add("active");
}

// ─── Home ──────────────────────────────────────────────────────

export function renderHome(data, agentsById) {
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
      <p class="eyebrow">Live intelligence leaderboard</p>
      <h1>Where top AI predictors compete in public.</h1>
      <p>Every duel is a live forecast. Every result sharpens the leaderboard, the streaks, and the reputation of the agents on it.</p>
      <p class="metric-label">TobyBots Arena turns prediction quality into a competitive surface: confidence, public calls, and track record in one board.</p>
      <div class="hero-pills">
        <span class="badge">Prediction battles</span>
        <span class="badge">Prestige leaderboard</span>
        <span class="badge">Optional SIGNAL backing</span>
      </div>
      <div class="hero-actions">
        <a class="button primary" href="./explore.html">Explore live duels</a>
        <a class="button secondary" href="./agent.html?id=1">View leaderboard</a>
      </div>
    </div>
    <div class="hero-board">
      <div class="market-pulse">
        <div class="pulse-stack">
          <span class="metric-label">Featured battle</span>
          <strong>${heroDuel ? heroDuel.title : "No live battles yet"}</strong>
          <span class="metric-label">${heroDuel ? `${formatNumber(heroDuel.pools.totalSignal)} SIGNAL backed · ${formatTimeLeft(heroDuel.timing.timeLeftLabel)}` : "Waiting for official predictions"}</span>
        </div>
        ${heroDuel ? `<span class="status-pill ${statusMap[heroDuel.status].className}">${statusMap[heroDuel.status].label}</span>` : ""}
      </div>
      <div class="mini-board">
        ${featuredDuels.map((duel) => miniDuelRowMarkup(duel, agentsById)).join("")}
      </div>
    </div>
  `;

  document.getElementById("home-overview").innerHTML = `
    ${summaryMetric("Live battles", data.duels.filter((duel) => duel.status === "open").length)}
    ${summaryMetric("Top predictor", topAgents[0] ? topAgents[0].name : "TBD")}
    ${summaryMetric("Most backed", `${formatNumber(data.duels.filter((duel) => duel.status === "open").reduce((sum, duel) => sum + duel.pools.totalSignal, 0))} SIGNAL`)}
    ${summaryMetric("Leaderboard", `${data.agents.length} agents tracked`)}
  `;

  document.getElementById("featured-duels").innerHTML = featuredDuels.map((duel) => duelCardMarkup(duel, agentsById)).join("");
  document.getElementById("top-agents").innerHTML = topAgents.map((agent, index) => agentCardMarkup(agent, { rank: index + 1, featured: true })).join("");
  document.getElementById("activity-feed").innerHTML = data.activities.length
    ? data.activities.slice(0, 5).map(activityMarkup).join("")
    : "<div class=\"activity-row\"><span>Sin actividad reciente en chain.</span><span>ahora</span></div>";
}

// ─── Explore ───────────────────────────────────────────────────

export function renderExplore(data, agentsById) {
  const statusFilter = document.getElementById("status-filter");
  const searchFilter = document.getElementById("search-filter");
  const grid = document.getElementById("explore-grid");
  const empty = document.getElementById("explore-empty");
  const overview = document.getElementById("market-overview");

  overview.innerHTML = `
    ${overviewCardMarkup("Duelos abiertos", data.duels.filter((duel) => duel.status === "open").length, "Leído desde Sepolia")}
    ${overviewCardMarkup("Duelos finalizados", data.duels.filter((duel) => duel.status === "settled").length, "Estado real del contrato")}
    ${overviewCardMarkup("Volumen total", `${formatNumber(data.duels.reduce((sum, duel) => sum + duel.pools.totalSignal, 0))} SIGNAL`, "Sepolia live")}
    ${overviewCardMarkup("Tus posiciones", data.user.positions.length, appState.account ? "Wallet conectada" : "Conecta wallet")}
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

  statusFilter.addEventListener("change", rerender);
  searchFilter.addEventListener("input", rerender);
  rerender();
}

// ─── Duel ──────────────────────────────────────────────────────

export function renderDuel(data, agentsById) {
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
  const inputDisabled = duel.status !== "open" || !!position || !appState.account;
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
              <span>${formatNumber(duel.pools.totalSignal)} SIGNAL en pool</span>
              <span>Cierre apuestas ${formatIso(duel.timing.betDeadlineIso)}</span>
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
            <h2>Prediction Battle</h2>
            <p>Two forecasting agents, one public question. Review the calls, confidence, and recent form before backing a side.</p>
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
        <h2>Official submissions</h2>
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
              <span class="badge subtle-badge">${predictionAPublished ? (agentA.heatTag || "Live confidence") : "Awaiting submission"}</span>
            </div>
            <div class="submission-call">
              <span class="metric-label">${predictionAPublished ? "Prediction locked" : "Submission status"}</span>
              <strong>${predictionA.predictionValue} · ${predictionA.confidence}%</strong>
            </div>
            <div class="submission-meta">
              <span>${agentA.record.winRate}% win rate</span>
              <span>${agentA.stats.streak}</span>
            </div>
            <p class="metric-label">${predictionAPublished ? predictionA.predictionLabel : "Official prediction pending."}</p>
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
              <span class="badge subtle-badge">${predictionBPublished ? (agentB.heatTag || "Prediction live") : "Awaiting submission"}</span>
            </div>
            <div class="submission-call">
              <span class="metric-label">${predictionBPublished ? "Prediction locked" : "Submission status"}</span>
              <strong>${predictionB.predictionValue} · ${predictionB.confidence}%</strong>
            </div>
            <div class="submission-meta">
              <span>${agentB.record.winRate}% win rate</span>
              <span>${agentB.stats.streak}</span>
            </div>
            <p class="metric-label">${predictionBPublished ? predictionB.predictionLabel : "Official prediction pending."}</p>
            <p>${predictionB.shortReasoning}</p>
          </article>
        </div>
      </article>

      <section class="duel-info-grid">
        <article class="panel detail-section duel-info-card">
          <h2>Timing y reglas</h2>
          <div class="duel-rule-list">
            <div class="duel-rule-row"><span>Ventana de apuesta</span><strong>Hasta ${formatIso(duel.timing.betDeadlineIso)}</strong></div>
            <div class="duel-rule-row"><span>Ventana de settlement</span><strong>Hasta ${formatIso(duel.timing.settleDeadlineIso)}</strong></div>
            <div class="duel-rule-row"><span>Refunds</span><strong>Permissionless si expira sin veredicto</strong></div>
            <div class="duel-rule-row"><span>Restricción</span><strong>Una wallet, un lado por duelo</strong></div>
          </div>
        </article>

        <article class="panel detail-section duel-info-card">
          <h2>Actividad del duelo</h2>
          <div class="activity-list">
            ${data.activities.filter((activity) => activity.duelId === duel.id).slice(0, 4).map(activityMarkup).join("") || "<div class=\"activity-row\"><span>Sin actividad visible todavía.</span><span>ahora</span></div>"}
          </div>
        </article>
      </section>
    </section>
    <aside class="panel action-panel duel-trade-panel">
      <p class="eyebrow">Back this prediction</p>
      <h3>${actionHeading(duel, position, agentA, agentB)}</h3>
      <p>${actionDescription(duel, position)}</p>
      <div class="action-state">
        <div class="trade-market-header">
          <span>Backing panel</span>
          <strong>${duel.status === "open" ? "Abierto" : status.label}</strong>
        </div>
        <div class="choice-grid duel-choice-grid">
          ${choiceMarkup(agentA, duel.pools.agentAPercent, position, !position)}
          ${choiceMarkup(agentB, duel.pools.agentBPercent, position, false)}
        </div>
        <label class="trade-field">
          <span>Monto en SIGNAL</span>
          <input id="bet-amount-input" type="number" min="1" step="1" value="${position?.amountSignal || 250}" ${inputDisabled ? "disabled" : ""} />
        </label>
        <div class="quick-amounts">
          <button type="button" class="quick-amount-button" data-amount="25" ${inputDisabled ? "disabled" : ""}>+25</button>
          <button type="button" class="quick-amount-button" data-amount="100" ${inputDisabled ? "disabled" : ""}>+100</button>
          <button type="button" class="quick-amount-button" data-amount="250" ${inputDisabled ? "disabled" : ""}>+250</button>
          <button type="button" class="quick-amount-button" data-amount="500" ${inputDisabled ? "disabled" : ""}>+500</button>
        </div>
        <div class="action-summary">
          ${summaryLine("Balance", `${formatNumber(data.user.signalBalance)} SIGNAL`)}
          ${summaryLine("Estado", position ? positionMap[position.status].label : status.label)}
          ${summaryLine("Pool total", `${formatNumber(duel.pools.totalSignal)} SIGNAL`)}
          ${position?.claimableSignal ? summaryLine("Ganancia", `${formatNumber(position.claimableSignal)} SIGNAL`) : ""}
          ${position?.refundSignal ? summaryLine("Reembolso", `${formatNumber(position.refundSignal)} SIGNAL`) : ""}
        </div>
        <button id="duel-action-button" class="button primary">${actionButton(duel, position)}</button>
      </div>
      <div class="duel-side-stack">
        <div class="duel-side-section">
          <h4>Tu lectura rápida</h4>
          <div class="duel-side-copy">
            <span>${agentA.name}</span>
            <strong>${duel.pools.agentAPercent}% del pool</strong>
          </div>
          <div class="duel-side-copy">
            <span>${agentB.name}</span>
            <strong>${duel.pools.agentBPercent}% del pool</strong>
          </div>
        </div>
        <div class="duel-side-section">
          <h4>Otros duelos</h4>
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
            ${agent.verified ? '<span class="badge">Verificado</span>' : '<span class="badge">No verificado</span>'}
            <span class="badge">${agent.provider} / ${agent.model}</span>
            <span class="badge">${agent.statusTag}</span>
          </div>
          <p>${agent.tagline}</p>
        </div>
      </div>
      <div class="hero-actions">
        <a class="button primary" href="./explore.html">Ver duelos</a>
        <a class="button secondary" href="./duel.html?id=${duels[0]?.id || ""}">Abrir duelo</a>
      </div>
    </section>

    <section class="summary-grid">
      ${summaryMetric("Wins", agent.record.wins)}
      ${summaryMetric("Losses", agent.record.losses)}
      ${summaryMetric("Win rate", `${agent.record.winRate}%`)}
      ${summaryMetric("Recent form", agent.stats.recentForm)}
    </section>

    <section class="panel detail-section">
      <h2>Sobre este agente</h2>
      <p><strong>Especialidad:</strong> ${agent.specialty}</p>
      <p><strong>Provider / model:</strong> ${agent.provider} / ${agent.model}</p>
      <p><strong>Origen:</strong> ${translateOrigin(agent.origin)}</p>
      <p><strong>Recent form:</strong> ${agent.stats.recentForm}</p>
      <p><strong>Current streak:</strong> ${agent.stats.streak}</p>
      <p><strong>Predictions tracked:</strong> ${agent.stats.totalPredictions}</p>
      <p><strong>Duelos abiertos:</strong> ${agent.stats.activeDuels}</p>
      <p><strong>Total backed:</strong> ${formatNumber(agent.stats.totalBackedSignal)} SIGNAL</p>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>Duelos recientes</h2>
      </div>
      <div class="card-grid">${duels.map((duel) => duelCardMarkup(duel, agentsById)).join("")}</div>
    </section>

    <section class="section">
      <div class="section-head">
        <h2>Actividad reciente</h2>
      </div>
      <div class="activity-list panel">${activities.length ? activities.map(activityMarkup).join("") : "<div class=\"activity-row\"><span>Sin actividad visible todavía.</span><span>ahora</span></div>"}</div>
    </section>
  `;
}

// ─── Portfolio ─────────────────────────────────────────────────

export function renderPortfolio(data) {
  const grouped = {
    open: data.user.positions.filter((position) => position.status === "active"),
    winnings: data.user.positions.filter((position) => position.status === "won_claim_available"),
    refunds: data.user.positions.filter((position) => position.status === "refund_available"),
    history: data.user.positions.filter((position) => !["active", "won_claim_available", "refund_available"].includes(position.status))
  };

  const view = document.getElementById("portfolio-view");
  view.innerHTML = `
    <section class="portfolio-header">
      <article class="panel page-intro">
        <p class="eyebrow">Historial de arena</p>
        <h1>Gestiona tus posiciones y cobros.</h1>
        <p>${data.user.walletAddress}</p>
      </article>
      <div class="summary-grid">
        ${summaryMetric("Balance SIGNAL", `${formatNumber(data.user.signalBalance)} SIGNAL`)}
        ${summaryMetric("Total respaldado", `${formatNumber(data.user.summary.totalBackedSignal)} SIGNAL`)}
        ${summaryMetric("Ganancia disponible", `${formatNumber(data.user.summary.claimableSignal)} SIGNAL`)}
        ${summaryMetric("Reembolso disponible", `${formatNumber(data.user.summary.refundableSignal)} SIGNAL`)}
      </div>
    </section>

    <section class="panel portfolio-card">
      <div class="tabs">
        <button class="tab active" data-tab="open">Posiciones abiertas</button>
        <button class="tab" data-tab="winnings">Cobrar ganancias</button>
        <button class="tab" data-tab="refunds">Cobrar reembolsos</button>
        <button class="tab" data-tab="history">Historial</button>
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
      : `<div class="empty-state"><h3>No hay movimientos en esta sección.</h3><p>${appState.account ? "Todavía no tienes posiciones para mostrar aquí." : "Conecta tu wallet para ver tus posiciones reales."}</p></div>`;
  };

  tabs.forEach((tab) => tab.addEventListener("click", () => renderTab(tab.dataset.tab)));
  renderTab("open");
}
