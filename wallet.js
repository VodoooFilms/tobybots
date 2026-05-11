// wallet.js — wallet connection, transactions, duel interactions
import { ethers } from "https://esm.sh/ethers@6.13.5";
import { CHAIN, SIGNAL_ABI, ARENA_ABI, appState } from "./state.js";
import { getLanguage } from "./i18n.js";
import { refreshApp } from "./app.js";

const isSpanish = () => getLanguage() === "es";

// ─── Wallet hydration ──────────────────────────────────────────

export async function hydrateWalletState(requestAccess) {
  if (!window.ethereum) return;

  appState.walletProvider = new ethers.BrowserProvider(window.ethereum);
  const accounts = await window.ethereum.request({
    method: requestAccess ? "eth_requestAccounts" : "eth_accounts"
  });
  appState.account = accounts[0] || null;

  if (!appState.account) return;

  const network = await appState.walletProvider.getNetwork();
  if (Number(network.chainId) !== CHAIN.id) {
    console.warn(`Wallet en red incorrecta (${Number(network.chainId)} ≠ ${CHAIN.id}). Modo solo lectura.`);
    appState.account = null;
    appState.signer = null;
    appState.signalWrite = null;
    appState.arenaWrite = null;
    return;
  }

  appState.signer = await appState.walletProvider.getSigner();
  appState.signalWrite = new ethers.Contract(CHAIN.signalToken, SIGNAL_ABI, appState.signer);
  appState.arenaWrite = new ethers.Contract(CHAIN.arena, ARENA_ABI, appState.signer);
}

// ─── Connect wallet ────────────────────────────────────────────

export async function connectWallet() {
  try {
    await hydrateWalletState(true);
    await refreshApp();
  } catch (error) {
    console.error(error);
    alert(error.message || (isSpanish() ? "No pude conectar la wallet." : "I could not connect the wallet."));
  }
}

// ─── Submit transaction ────────────────────────────────────────

export async function submitArenaAction(button, callback) {
  const label = button.textContent;
  button.disabled = true;
  button.textContent = isSpanish() ? "Enviando..." : "Sending...";
  try {
    const tx = await callback();
    await tx.wait();
    await refreshApp();
  } catch (error) {
    console.error(error);
    alert(error.shortMessage || error.message || (isSpanish() ? "No pude completar la transacción." : "I could not complete the transaction."));
    button.disabled = false;
    button.textContent = label;
  }
}

// ─── Duel interactions ─────────────────────────────────────────

export function bindDuelInteractions(duel, position, defaultAgent) {
  const button = document.getElementById("duel-action-button");
  if (!button) return;

  if (!appState.account) {
    button.onclick = connectWallet;
    return;
  }

  if (duel.status === "open" && !position) {
    const choices = [...document.querySelectorAll(".choice-button")];
    const amountInput = document.getElementById("bet-amount-input");
    const quickAmounts = [...document.querySelectorAll(".quick-amount-button")];
    let selectedAgentId = defaultAgent.id;
    choices.forEach((choice) => {
      choice.addEventListener("click", () => {
        choices.forEach((item) => item.classList.remove("selected"));
        choice.classList.add("selected");
        selectedAgentId = choice.dataset.agentId;
      });
    });

    quickAmounts.forEach((chip) => {
      chip.addEventListener("click", () => {
        if (!amountInput || amountInput.disabled) return;
        amountInput.value = String((Number(amountInput.value || 0) + Number(chip.dataset.amount || 0)));
      });
    });

    button.onclick = async () => {
      const amount = amountInput.value;
      if (!amount || Number(amount) <= 0) {
        alert(isSpanish() ? "Ingresa un monto válido." : "Enter a valid amount.");
        return;
      }

      await submitArenaAction(button, async () => {
        const amountWei = ethers.parseUnits(amount, 18);
        const allowance = await appState.signalWrite.allowance(appState.account, CHAIN.arena);
        if (allowance < amountWei) {
          const approveTx = await appState.signalWrite.approve(CHAIN.arena, amountWei);
          await approveTx.wait();
        }
        return appState.arenaWrite.bet(duel.id, selectedAgentId, amountWei);
      });
    };
    return;
  }

  if (position?.status === "won_claim_available") {
    button.onclick = async () => submitArenaAction(button, () => appState.arenaWrite.claimWinnings(duel.id));
    return;
  }

  if (position?.status === "refund_available") {
    button.onclick = async () => submitArenaAction(button, () => appState.arenaWrite.claimRefund(duel.id));
    return;
  }

  if (duel.status === "refund_available" && !position) {
    button.onclick = async () => submitArenaAction(button, () => appState.arenaWrite.emergencyRefund(duel.id));
    return;
  }

  button.disabled = duel.status === "open" && !!position;
  button.onclick = () => window.location.assign("./portfolio.html");
}
