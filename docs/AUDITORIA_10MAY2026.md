# TobyBots Arena — Auditoría & Avances — 10 Mayo 2026

## Actualizacion post-arreglos y deploy

Fecha de actualizacion: 10 Mayo 2026

### Estado actual publicado

- Frontend premium pass aplicado y publicado
- Deploy web activo en Firebase Hosting:
  - `https://tobybots-arena.web.app`
- Repo sincronizado en GitHub:
  - `https://github.com/VodoooFilms/tobybots`
- Branch publicada:
  - `main`
- Commit publicado:
  - `315942b` — `Polish arena UX and publish hosting-ready build`

### QA final ejecutado

Se reviso el estado actual del producto despues del premium perception pass y
se corrigieron solo issues claros de salida:

- placeholders / estados vacios demasiado agresivos durante hidratacion
- copy engañoso en duelos sin submission oficial publicada
- packaging de Firebase incompleto (`predictions.json` no entraba al build)

### Resultado funcional actual

- La app mantiene el posicionamiento de "AI prediction competition"
- No se tocaron contratos, wallet logic, arquitectura ni backend
- Los avatares SVG cargan correctamente en las superficies validadas
- Los botones de wallet siguen visibles
- No se detectaron errores de consola en home, explore, duel y agent
- Las rutas locales principales responden OK

### Validaciones ejecutadas en esta pasada

```bash
npm test
npm run hosting:prepare
npx firebase-tools deploy --only hosting --non-interactive
git push origin main
```

Resultado:

- `23/23` tests passing
- `hosting:prepare` OK
- Deploy Firebase OK
- Push a GitHub OK

### Ajustes adicionales hechos despues de la auditoria inicial

- fallback markup agregado en `index.html`, `duel.html`, `agent.html`,
  `portfolio.html` para evitar first-paint vacio mientras sincroniza
- copy refinado para submissions pendientes:
  - `Prediction locked` solo cuando existe prediction oficial
  - `Awaiting submission` / `Official prediction pending` cuando aun no existe
- `scripts/prepare-hosting.sh` actualizado para copiar `predictions.json`

### Veredicto actualizado

TobyBots Arena queda en estado **deployado, versionado y listo para demo /
revision externa** en su version actual de Firebase Hosting.

## Resumen de la sesión

Auditoría completa + redeploy del Arena en Sepolia + seed de demo +
modularización del frontend. **5 de 5 issues corregidos.**
Arena funcional con 1 duelo vivo, frontend modularizado (6 archivos).

═══════════════════════════════════════════════
## ESTADO ACTUAL DEL PROYECTO
═══════════════════════════════════════════════

### Contratos (Sepolia Testnet, chainId 11155111)

| Contrato | Dirección | Estado |
|----------|-----------|--------|
| SIGNAL | `0x7cfBB6a8b34F4E247bb4d82ec15463EB7c9A83A3` | Verificado (Etherscan + Sourcify) |
| Arena (nuevo) | `0xB10FaBc2DFa536E4F0d853057e83663e91Bdd74B` | Deployeado 10-May-2026, bytecode OK |
| Arena (viejo) | `0x0Ec0F1a5BaE2f6DC829D2f72ffB4d962C83b1EC1` | Deprecado (emergencyRefund onlyOwner) |

### Billeteras

| Rol | Dirección | ETH | SIGNAL |
|-----|-----------|-----|--------|
| Owner/Deployer | `0xC242829F7A7Fd6fe910738fe165ce5D19c1448FA` | 0.099 ETH | ~99,969,900 |
| Bettor demo | `0x328818A2A5680f28589A9107BbEb57B93E2dA884` | 0.002 ETH | 25 |

### Estado on-chain (10-May-2026)

- duelCount: 1
- agentCount: 3 (doomgpt, bulltard, weatherwiz)
- Duelo #1: doomgpt vs bulltard — "BTC cierra mayo 2026 arriba de $100K"
  - Pool A: 25 SIGNAL (doomgpt)
  - Pool B: 25 SIGNAL (bulltard)
  - Total: 50 SIGNAL
  - Estado: Open
  - Bet deadline: ~7:22 AM 10-May-2026 (1 hora desde creación)
- Arena SIGNAL balance: 50.0 (escrow del duelo)
- Bytecode: 15346 hex chars — MATCHES local (emergencyRefund permissionless)

### RPC
- Actual: `https://ethereum-sepolia-rpc.publicnode.com`
- Anterior: `https://1rpc.io/sepolia` (rate-limited)
- Configurado en: state.js, config.json, hardhat.config.js, .env

### Tests
- 23/23 passing (457ms)
- Compilación: OK

═══════════════════════════════════════════════
## FIXES APLICADOS HOY (5/5 COMPLETADOS)
═══════════════════════════════════════════════

### Fix 1 ✅ [ALTO] — Redeploy Arena con emergencyRefund permissionless
- Arena viejo (0x0Ec0F...) tenía emergencyRefund con onlyOwner
- Nuevo Arena (0xB10F...) tiene emergencyRefund permissionless
- Bytecode verificado: 15346 == 15346 local
- Agentes recreados: doomgpt, bulltard, weatherwiz
- Dirección actualizada en: state.js, config.json, scripts/verify-deploy.js,
  scripts/demo-setup.js, README.md, DEPLOYMENT.md, TESTNET_PLAYBOOK.md

### Fix 2 ✅ [ALTO] — LAUNCH_CHECKLIST corregido
- "19 tests" → "23 tests" (docs/LAUNCH_CHECKLIST.md:44)

### Fix 3 ✅ [MEDIO] — calculatePayout sin floating point
- utils.js — `totalSignal * 0.98` → math entera como Solidity:
  `totalPot - Math.floor((totalPot * 200) / 10000)`

### Fix 4 ✅ [MEDIO] — buildExploreDisplayDuels sin duplicados
- utils.js — eliminado el relleno cíclico de cards
- Solo muestra duelos reales: `duels.slice(0, targetCount)`

### Fix 5 ✅ [MEDIO] — Modularización de app.js
- app.js: 1203 líneas monolíticas → 6 archivos modulares (1,281 líneas total)

| Archivo | Líneas | Responsabilidad |
|---------|--------|-----------------|
| state.js | 99 | Constantes, ABIs, appState, carga de config |
| utils.js | 360 | Formatos, math exacta, markup builders |
| data.js | 284 | Lectura on-chain, construcción de modelos |
| render.js | 363 | Renderizado de las 5 páginas |
| wallet.js | 132 | Wallet, transacciones, interacciones |
| app.js | 43 | Entry point, init(), refreshApp() |

Cada archivo tiene una responsabilidad clara. Importaciones con ES modules,
sin dependencias circulares. Cero errores en consola.

### Extras aplicados
- Wallet en red incorrecta ya no crashea la app (modo solo lectura)
- RPC cambiado de 1rpc.io → publicnode.com (sin rate limits)
- Seed de demo ligero (1 duelo, 50 SIGNAL, costo mínimo)
- Scripts nuevos: seed-light.js, seed-settle.js

═══════════════════════════════════════════════
## RUTAS Y ARCHIVOS CLAVE
═══════════════════════════════════════════════

```
tobybots/
├── app.js              ← Entry point (43 líneas) ★ REFACTORIZADO
├── state.js            ← Constantes y estado global ★ NUEVO
├── utils.js            ← Helpers y markup builders ★ NUEVO
├── data.js             ← Lectura on-chain ★ NUEVO
├── render.js           ← Renderizado de UI ★ NUEVO
├── wallet.js           ← Wallet y transacciones ★ NUEVO
├── styles.css           ← Estilos (1477 líneas)
├── config.json          ← Direcciones de contratos
├── agents.json          ← Metadata de agentes
├── contracts/
│   ├── SignalToken.sol  ← ERC20 + 1% fee + whitelist
│   └── Arena.sol        ← Lógica de duelos y apuestas
├── test/
│   └── Arena.test.js    ← 23 tests
├── scripts/
│   ├── deploy.js        ← Deploy completo (SIGNAL + Arena + agentes)
│   ├── deploy-arena.js  ← Deploy solo Arena sobre SIGNAL existente
│   ├── verify-deploy.js ← Verificación on-chain
│   ├── demo-setup.js    ← Demo completa (2 duelos, 2 bettors)
│   ├── seed-light.js    ← Seed ligero (1 duelo, 50 SIGNAL) ★ NUEVO
│   ├── seed-settle.js   ← Settlear duelo #1 ★ NUEVO
│   └── demo.js / demo-fund.js
├── docs/
│   ├── AUDITORIA_10MAY2026.md ← Este reporte ★ NUEVO
│   ├── DEPLOYMENT.md    ← Registro de deploy (ACTUALIZADO)
│   ├── TESTNET_PLAYBOOK.md ← Instrucciones paso a paso (ACTUALIZADO)
│   ├── LAUNCH_CHECKLIST.md ← Checklist pre-demo (ACTUALIZADO)
│   ├── PLAN_AUDIT_FIXES.md
│   ├── BRAND_SYSTEM.md
│   └── DEV_HANDOFF_2026-05-06.md
├── *.html               ← 7 páginas (index, explore, duel, agent,
│                          portfolio, how-it-works, add-sepolia)
├── .env                 ← PRIVATE_KEY, SEPOLIA_RPC (creado hoy)
├── .env.example
├── .github/workflows/ci.yml ← CI/CD
├── hardhat.config.js
└── package.json
```

═══════════════════════════════════════════════
## COMANDOS RÁPIDOS
═══════════════════════════════════════════════

```bash
# Servir la web
npm run serve                    # http://localhost:8000

# Compilar y testear
npx hardhat compile
npm test                        # 23 tests

# Verificar estado on-chain
npx hardhat run scripts/verify-deploy.js --network sepolia

# Settlear duelo #1 (después de 1h del seed)
npx hardhat run scripts/seed-settle.js --network sepolia

# Demo completa (2 duelos + 2 bettors con 5000 SIGNAL c/u)
npx hardhat run scripts/demo-setup.js --network sepolia
```

═══════════════════════════════════════════════
## ISSUES PENDIENTES (post-Fix 5)
═══════════════════════════════════════════════

| # | Severidad | Descripción | Archivo |
|---|-----------|-------------|---------|
| 7 | MEDIO | Sin tests dedicados para SignalToken standalone | test/Arena.test.js |
| 8 | MEDIO | Sin estados de loading/error granular durante RPC | data.js |
| 9 | MEDIO | Owner wallet con 0.099 ETH — justo para operar | — |
| 10 | BAJO | styles.css monolítico (1477 líneas) | styles.css |
| 11 | BAJO | Sin favicon en páginas de la Arena | *.html |
| 12 | BAJO | how-it-works.html tiene CSS inline | how-it-works.html |
| 13 | BAJO | .gitignore no cubre .DS_Store, .vscode/ | .gitignore |

═══════════════════════════════════════════════
## PRÓXIMOS PASOS
═══════════════════════════════════════════════

### Inmediato (hoy)
- [x] Redeploy Arena con emergencyRefund permissionless
- [x] Seed de demo ligero (1 duelo, 50 SIGNAL)
- [x] Fix #5: modularizar app.js (6 archivos)
- [ ] Settlear duelo #1 (esperar 1h desde creación)
- [ ] Cobrar ganancia desde la UI (claimWinnings)

### Corto plazo (esta semana)
- [ ] Ejecutar demo-setup completo con 2-3 wallets
- [ ] Crear 1 duelo Settled + 1 duelo Open para demo completa
- [ ] Verificar contrato nuevo en Etherscan/Sourcify
- [ ] Probar flujo completo: connect → approve → bet → settle → claim → refund

### Mediano plazo
- [ ] Agregar tests para SignalToken standalone
- [ ] Agregar loading states en UI
- [ ] Refactor CSS
- [ ] Agregar favicon

═══════════════════════════════════════════════
## VEREDICTO FINAL
═══════════════════════════════════════════════

TobyBots Arena está funcional en Sepolia con frontend modularizado.
Los 5 issues de la auditoría inicial están cerrados. El contrato nuevo
tiene emergencyRefund permissionless, la UI no crashea con wallet en
red incorrecta, el RPC es estable, y hay 1 duelo vivo para demo.

Con 0.099 ETH en la wallet owner hay margen para ~20 transacciones más.
El próximo hito natural es settlear el duelo #1 y probar el flujo
completo de claim.

CALIFICACION ACTUAL: 8.5 / 10 — "Arena viva, modularizada, lista para demo."
