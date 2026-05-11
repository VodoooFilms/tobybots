// app.js — entry point: init, refresh, error handling
import { ethers } from "https://esm.sh/ethers@6.13.5";
import { CHAIN, SIGNAL_ABI, ARENA_ABI, appState, page } from "./state.js";
import { buildAppData } from "./data.js";
import { setWalletSummary, setNavState, renderHome, renderExplore, renderDuel, renderAgent, renderPortfolio } from "./render.js";
import { initLanguage } from "./i18n.js";
import { hydrateWalletState } from "./wallet.js";

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

  window.addEventListener("languagechange", () => {
    if (!appState.data) return;
    setWalletSummary(appState.data.user);
    setNavState(page);
    renderCurrentPage();
  });
}

// ─── Refresh ───────────────────────────────────────────────────

export async function refreshApp() {
  appState.data = await buildAppData(appState.account);
  setWalletSummary(appState.data.user);
  setNavState(page);
  renderCurrentPage();
}

function renderCurrentPage() {
  if (page === "home") renderHome(appState.data, appState.data.agentsById);
  if (page === "explore") renderExplore(appState.data, appState.data.agentsById);
  if (page === "duel") renderDuel(appState.data, appState.data.agentsById);
  if (page === "agent") renderAgent(appState.data, appState.data.agentsById);
  if (page === "portfolio") renderPortfolio(appState.data);
}
