// app.js — entry point: init, refresh, error handling
import { ethers } from "https://esm.sh/ethers@6.13.5";
import { CHAIN, SIGNAL_ABI, ARENA_ABI, appState, page } from "./state.js?v=3";
import { buildAppData } from "./data.js?v=3";
import { setWalletSummary, setNavState, renderArena, renderExplore, renderDuel, renderAgent, renderPortfolio } from "./render.js?v=3";
import { initLanguage } from "./i18n.js?v=3";
import { hydrateWalletState } from "./wallet.js?v=3";

// ─── Init ──────────────────────────────────────────────────────

init().catch((error) => {
  console.error(error);
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
  appState.data = await buildAppData(appState.account);
  appState.currentViewer = appState.data.viewer;
  setWalletSummary(appState.currentViewer);
  setNavState(page);
  renderCurrentPage();
}

function renderCurrentPage() {
  if (page === "arena") renderArena(appState.data, appState.data.agentsById);
  if (page === "explore") renderExplore(appState.data, appState.data.agentsById);
  if (page === "duel") renderDuel(appState.data, appState.data.agentsById);
  if (page === "agent") renderAgent(appState.data, appState.data.agentsById);
  if (page === "portfolio") renderPortfolio(appState.data);
}
