// app.js — entry point: init, refresh, error handling
import { ethers } from "https://esm.sh/ethers@6.13.5";
import { CHAIN, SIGNAL_ABI, ARENA_ABI, appState, page } from "./state.js?v=3";
import { buildAppData } from "./data.js?v=3";
import { setWalletSummary, setNavState, renderArena, renderExplore, renderDuel, renderAgent, renderPortfolio } from "./render.js?v=3";
import { initLanguage } from "./i18n.js?v=3";
import { t } from "./i18n.js?v=3";
import { hydrateWalletState } from "./wallet.js?v=3";

// ─── Init ──────────────────────────────────────────────────────

init().catch((error) => {
  console.error(error);
  document.body.classList.remove("is-app-loading");
  document.getElementById("app-loading-overlay")?.remove();
  document.body.innerHTML = `
    <main class="shell">
      <section class="panel empty-state">
        <h1>Toby Bots Arena could not load.</h1>
        <p>${error.message}</p>
      </section>
    </main>
  `;
});

async function init() {
  initLanguage();
  setAppLoading(true);
  appState.readProvider = new ethers.JsonRpcProvider(CHAIN.rpcUrl);
  appState.signalRead = new ethers.Contract(CHAIN.signalToken, SIGNAL_ABI, appState.readProvider);
  appState.arenaRead = new ethers.Contract(CHAIN.arena, ARENA_ABI, appState.readProvider);

  await hydrateWalletState(false);
  await refreshApp();

  window.addEventListener("languagechange", async () => {
    if (!appState.data) return;
    await refreshApp();
  });
}

// ─── Refresh ───────────────────────────────────────────────────

export async function refreshApp() {
  appState.isRefreshing = true;
  setAppLoading(true);
  setWalletSummary(appState.currentViewer);
  try {
    appState.data = await buildAppData(appState.account);
    appState.currentViewer = appState.data.viewer;
    setWalletSummary(appState.currentViewer);
    setNavState(page);
    renderCurrentPage();
  } finally {
    appState.isRefreshing = false;
    setAppLoading(false);
    setWalletSummary(appState.currentViewer);
  }
}

function renderCurrentPage() {
  if (page === "arena") renderArena(appState.data, appState.data.agentsById);
  if (page === "explore") renderExplore(appState.data, appState.data.agentsById);
  if (page === "duel") renderDuel(appState.data, appState.data.agentsById);
  if (page === "agent") renderAgent(appState.data, appState.data.agentsById);
  if (page === "portfolio") renderPortfolio(appState.data);
}

function setAppLoading(isLoading) {
  document.body.classList.toggle("is-app-loading", isLoading);

  let overlay = document.getElementById("app-loading-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "app-loading-overlay";
    overlay.className = "app-loading-overlay hidden";
    overlay.innerHTML = `
      <div class="app-loading-card" role="status" aria-live="polite">
        <span class="app-loading-spinner" aria-hidden="true"></span>
        <strong>${t("loadingSyncTitle")}</strong>
        <p>${t("loadingSyncBody")}</p>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  const title = overlay.querySelector("strong");
  const body = overlay.querySelector("p");
  if (title) title.textContent = t("loadingSyncTitle");
  if (body) body.textContent = t("loadingSyncBody");

  overlay.classList.toggle("hidden", !isLoading);
}
