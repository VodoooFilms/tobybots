// app.js — entry point: init, refresh, error handling
import { ethers } from "https://esm.sh/ethers@6.13.5";
import { CHAIN, SIGNAL_ABI, ARENA_ABI, appState, page } from "./state.js";
import { buildAppData } from "./data.js";
import { setWalletSummary, setNavState, renderHome, renderExplore, renderDuel, renderAgent, renderPortfolio } from "./render.js";
import { hydrateWalletState } from "./wallet.js";

// ─── Init ──────────────────────────────────────────────────────

init().catch((error) => {
  console.error(error);
  document.body.innerHTML = `
    <main class="shell">
      <section class="panel empty-state">
        <h1>No pude cargar Toby Bots Arena.</h1>
        <p>${error.message}</p>
      </section>
    </main>
  `;
});

async function init() {
  appState.readProvider = new ethers.JsonRpcProvider(CHAIN.rpcUrl);
  appState.signalRead = new ethers.Contract(CHAIN.signalToken, SIGNAL_ABI, appState.readProvider);
  appState.arenaRead = new ethers.Contract(CHAIN.arena, ARENA_ABI, appState.readProvider);

  await hydrateWalletState(false);
  await refreshApp();
}

// ─── Refresh ───────────────────────────────────────────────────

export async function refreshApp() {
  appState.data = await buildAppData(appState.account);
  setWalletSummary(appState.data.user);
  setNavState(page);

  if (page === "home") renderHome(appState.data, appState.data.agentsById);
  if (page === "explore") renderExplore(appState.data, appState.data.agentsById);
  if (page === "duel") renderDuel(appState.data, appState.data.agentsById);
  if (page === "agent") renderAgent(appState.data, appState.data.agentsById);
  if (page === "portfolio") renderPortfolio(appState.data);
}
