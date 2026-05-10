# TobyBots

Documento interno del proyecto unificado `TobyBots`.

Este repo junta en una sola base:

- la web pública de Toby Bots Arena
- el token `SIGNAL`
- el contrato `Arena`
- scripts de despliegue y demos
- tests de Hardhat
- documentación operativa

## Resumen

TobyBots Arena es una experiencia web estática que lee estado onchain desde Sepolia y permite a un usuario conectar wallet, aprobar `SIGNAL`, apostar por un agente, cobrar ganancias o recuperar fondos si un duelo expira sin veredicto.

La arquitectura está separada en dos capas:

1. Capa de interfaz: HTML + CSS + JS estático servido desde esta carpeta.
2. Capa de protocolo: contratos `SignalToken.sol` y `Arena.sol` desplegados en Sepolia.

La UI no depende de backend propio. Lee directamente desde RPC y escribe onchain vía MetaMask usando `ethers`.

## Arquitectura general

```text
Browser
  -> index.html / explore.html / duel.html / agent.html / portfolio.html
  -> app.js
  -> ethers BrowserProvider / JsonRpcProvider
  -> Sepolia RPC
  -> SignalToken.sol
  -> Arena.sol
```

## Componentes principales

### 1. Web estática

Archivos principales:

- [index.html](/Users/antoin/Documents/tobybots/index.html)
- [explore.html](/Users/antoin/Documents/tobybots/explore.html)
- [duel.html](/Users/antoin/Documents/tobybots/duel.html)
- [agent.html](/Users/antoin/Documents/tobybots/agent.html)
- [portfolio.html](/Users/antoin/Documents/tobybots/portfolio.html)
- [how-it-works.html](/Users/antoin/Documents/tobybots/how-it-works.html)
- [app.js](/Users/antoin/Documents/tobybots/app.js) — entry point (43 líneas)
- [state.js](/Users/antoin/Documents/tobybots/state.js) — constantes y estado
- [utils.js](/Users/antoin/Documents/tobybots/utils.js) — helpers y markup
- [data.js](/Users/antoin/Documents/tobybots/data.js) — lectura on-chain
- [render.js](/Users/antoin/Documents/tobybots/render.js) — renderizado UI
- [wallet.js](/Users/antoin/Documents/tobybots/wallet.js) — wallet y transacciones
- [styles.css](/Users/antoin/Documents/tobybots/styles.css)

Responsabilidad:

- renderizar la experiencia Arena
- leer agentes, duelos, pools y actividad desde `Arena`
- leer balances y allowances desde `SIGNAL`
- conectar MetaMask
- ejecutar acciones onchain del usuario

La UI usa `document.body.dataset.page` para decidir qué vista renderizar. La lógica está modularizada en 6 archivos: `state.js` (constantes y estado), `data.js` (lectura on-chain), `render.js` (renderizado), `wallet.js` (transacciones), `utils.js` (helpers), y `app.js` (entry point).

### 2. Token `SIGNAL`

Contrato: [contracts/SignalToken.sol](/Users/antoin/Documents/tobybots/contracts/SignalToken.sol)

Responsabilidad:

- ERC-20 base del sistema
- `ERC20Permit`
- fee de transferencia del 1%
- whitelist para evitar fee en flujos internos de Arena

Puntos clave:

- supply fija: `100,000,000 * 10^18`
- `feeCollector` configurable por owner
- `whitelist[address]` permite excluir direcciones del fee
- el contrato `Arena` debe estar en whitelist para que apuestas, cobros y refunds no sufran el fee del 1%

Regla importante:

- entre usuarios normales, `SIGNAL` cobra fee
- entre usuario y `Arena`, el fee se evita usando whitelist

### 3. Contrato `Arena`

Contrato: [contracts/Arena.sol](/Users/antoin/Documents/tobybots/contracts/Arena.sol)

Responsabilidad:

- registrar agentes
- crear duelos
- recibir apuestas en `SIGNAL`
- liquidar ganadores
- habilitar refunds de emergencia
- acumular comisión de la arena

Constantes clave:

- `ARENA_CUT = 200` basis points = 2%
- ventana mínima de apuesta: `1 hour`
- ventana máxima de apuesta: `30 days`
- ventana de settlement tras cierre de apuestas: `14 days`

Entidades principales:

- `Agent`
  - identidad pública del bot
  - creador
  - specialty
  - wins / losses
  - totalWagered

- `Duel`
  - agente A y agente B
  - tesis / evento a resolver
  - deadlines de apuesta y settlement
  - pools de ambos lados
  - ganador
  - estado

Estados:

- `Open`: acepta apuestas
- `Closed`: settlement expiró y se habilitó refund
- `Settled`: owner declaró ganador

### 4. Tooling de contratos

Archivos principales:

- [hardhat.config.js](/Users/antoin/Documents/tobybots/hardhat.config.js)
- [test/Arena.test.js](/Users/antoin/Documents/tobybots/test/Arena.test.js)
- [scripts/deploy.js](/Users/antoin/Documents/tobybots/scripts/deploy.js)
- [scripts/deploy-arena.js](/Users/antoin/Documents/tobybots/scripts/deploy-arena.js)
- [scripts/verify-deploy.js](/Users/antoin/Documents/tobybots/scripts/verify-deploy.js)
- [scripts/demo.js](/Users/antoin/Documents/tobybots/scripts/demo.js)
- [scripts/demo-setup.js](/Users/antoin/Documents/tobybots/scripts/demo-setup.js)
- [scripts/demo-fund.js](/Users/antoin/Documents/tobybots/scripts/demo-fund.js)
- [scripts/seed-light.js](/Users/antoin/Documents/tobybots/scripts/seed-light.js)
- [scripts/seed-settle.js](/Users/antoin/Documents/tobybots/scripts/seed-settle.js)
- [scripts/claim-winnings.js](/Users/antoin/Documents/tobybots/scripts/claim-winnings.js)

Responsabilidad:

- compilar
- testear
- desplegar en Sepolia
- sembrar agentes y duelos demo
- verificar contratos y balances

## Flujo del producto

### Flujo feliz

1. Se crean agentes con `createAgent(name, specialty)`.
2. Se abre un duelo con `createDuel(agentA, agentB, eventDescription, betDurationSeconds)`.
3. El usuario aprueba `SIGNAL` a `Arena`.
4. El usuario apuesta con `bet(duelId, agentId, amount)`.
5. El owner liquida con `settle(duelId, winnerAgentId)`.
6. Cada ganador cobra con `claimWinnings(duelId)`.
7. La arena puede retirar fees con `withdrawFees()`.

### Flujo de emergencia

1. El duelo no se liquida antes de `settleDeadline`.
2. Cualquiera puede llamar `emergencyRefund(duelId)`.
3. El duelo pasa a `Closed`.
4. Cada usuario recupera su apuesta con `claimRefund(duelId)`.

## Cómo habla la UI con la chain

La UI usa dos modos de acceso:

- lectura:
  - `ethers.JsonRpcProvider`
  - RPC por defecto: `https://ethereum-sepolia-rpc.publicnode.com`

- escritura:
  - `ethers.BrowserProvider(window.ethereum)`
  - firma vía MetaMask

En [app.js](/Users/antoin/Documents/tobybots/app.js) el objeto `CHAIN` fija:

- `id = 11155111`
- `name = Sepolia`
- dirección del token `SIGNAL`
- dirección del contrato `Arena`

La app:

- obtiene `agentCount()` y `duelCount()`
- lee cada agente y cada duelo
- construye modelos enriquecidos para UI
- calcula estados derivados como porcentaje de pool, estatus visual, portfolio del usuario y actividad

No existe API intermedia. Todo sale de contratos más metadatos front hardcodeados.

## Metadatos del frontend

`app.js` mezcla datos onchain con datos editoriales locales:

- `AGENT_METADATA`
- `statusMap`
- `positionMap`

Eso significa:

- el récord, pools y estado viven onchain
- la narrativa, tagline, categoría y labels de UI viven en frontend

Si se agrega un agente onchain que no exista en `AGENT_METADATA`, la app igual funciona, pero cae en defaults de `Community Agent`.

## Estructura de carpetas

```text
tobybots/
├── app.js               ← Entry point (43 líneas)
├── state.js             ← Constantes y estado global
├── utils.js             ← Helpers y markup builders
├── data.js              ← Lectura on-chain
├── render.js            ← Renderizado de UI
├── wallet.js            ← Wallet y transacciones
├── index.html
├── explore.html
├── duel.html
├── agent.html
├── portfolio.html
├── how-it-works.html
├── styles.css
├── config.json           ← Direcciones de contratos
├── agents.json           ← Metadata de agentes
├── tobybots-img/
├── contracts/
├── scripts/
├── test/
├── mock/
├── docs/
├── archive/legacy-landing/
├── .github/workflows/ci.yml
├── .env.example
├── package.json
└── hardhat.config.js
```

Qué guarda cada zona:

- raíz web: la Arena publicada
- `contracts/`: protocolo Solidity
- `scripts/`: despliegue, verificación y demos
- `test/`: suite Hardhat
- `mock/`: datos auxiliares para referencias y pruebas manuales
- `docs/`: operación, branding, launch y handoff
- `archive/legacy-landing/`: landing previa de TobyBots, conservada solo como referencia histórica

## Red y despliegue actual

La configuración actual apunta a Sepolia.

Direcciones en [config.json](/Users/antoin/Documents/tobybots/config.json) y [state.js](/Users/antoin/Documents/tobybots/state.js):

- `SIGNAL`: `0x7cfBB6a8b34F4E247bb4d82ec15463EB7c9A83A3`
- `Arena`: `0xB10FaBc2DFa536E4F0d853057e83663e91Bdd74B`

RPC: `https://ethereum-sepolia-rpc.publicnode.com`

La capa de config runtime existe: `config.json` se carga al iniciar y las direcciones se leen desde `state.js`.

## Hosting y dominio

El frontend público se publica en Firebase Hosting.

Configuración actual:

- proyecto Firebase: `tobybots-arena`
- sitio Firebase Hosting: `tobybots-arena`
- carpeta publicada: `public`
- `predeploy`: `npm run hosting:prepare`

Referencias:

- [firebase.json](/Users/antoin/Documents/tobybots/firebase.json)
- [.firebaserc](/Users/antoin/Documents/tobybots/.firebaserc)
- [scripts/prepare-hosting.sh](/Users/antoin/Documents/tobybots/scripts/prepare-hosting.sh)

Dominios conectados:

- `tobybots.com` -> Firebase Hosting
- `www.tobybots.com` -> `CNAME tobybots-arena.web.app`

Nota operativa:

- si `www.tobybots.com` fue movido recientemente desde otro proveedor, Firebase puede quedar un rato en `Requiere configuración` mientras termina la validación ACME y la emisión del certificado SSL
- durante esa ventana, el DNS puede ya estar correcto pero `https://www.tobybots.com` todavía mostrar error de certificado hasta que Firebase termine de provisionarlo
- no conviene seguir cambiando DNS durante esa etapa

## Comandos útiles

Instalación:

```bash
npm install
```

Servir la web:

```bash
npm run serve
```

Alternativa equivalente:

```bash
python3 -m http.server 8000
```

Compilar contratos:

```bash
npx hardhat compile
```

Correr tests:

```bash
npm test
```

Deploy completo:

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

Deploy solo de Arena sobre un `SIGNAL` existente:

```bash
npx hardhat run scripts/deploy-arena.js --network sepolia
```

Verificación rápida del estado live:

```bash
npx hardhat run scripts/verify-deploy.js --network sepolia
```

Preparar artefactos para Firebase Hosting:

```bash
npm run hosting:prepare
```

Deploy de Hosting:

```bash
firebase deploy --only hosting
```

## Variables de entorno

Referencias:

- [hardhat.config.js](/Users/antoin/Documents/tobybots/hardhat.config.js)
- [.env.example](/Users/antoin/Documents/tobybots/.env.example)

Variables esperadas:

- `SEPOLIA_RPC`
- `PRIVATE_KEY`
- `ETHERSCAN_API_KEY`

Uso:

- `SEPOLIA_RPC`: nodo RPC para lecturas y despliegues
- `PRIVATE_KEY`: wallet de deploy
- `ETHERSCAN_API_KEY`: verify

## Riesgos y decisiones de diseño

### Sin backend

Ventaja:

- menos moving parts

Costo:

- direcciones y cierta lógica editorial están hardcodeadas en frontend

### Owner centralizado para settlement

Ventaja:

- flujo simple para demo y MVP

Costo:

- la resolución del duelo depende del owner
- si el owner no liquida a tiempo, el sistema cae al flujo de refund

### Metadata híbrida

Ventaja:

- permite una experiencia más cuidada sin inflar almacenamiento onchain

Costo:

- parte de la identidad del agente no es fuente única onchain

### Fee bypass por whitelist

Ventaja:

- evita doble fricción económica en apuestas y cobros

Costo:

- la whitelist de `SIGNAL` se vuelve pieza crítica de configuración

## Qué testea la suite

La suite en [test/Arena.test.js](/Users/antoin/Documents/tobybots/test/Arena.test.js) cubre:

- supply inicial de `SIGNAL`
- fee del 1% en transferencias
- creación de agentes
- flujo completo de duelo
- payout proporcional al ganador
- no payout para perdedor
- bloqueo de doble claim
- refund de emergencia
- bloqueo de refund antes de tiempo

## Estado del repo

Este repo ya es el proyecto único de TobyBots en `Documents`.

Además:

- la Arena publicada vive en la raíz
- la landing anterior quedó archivada en `archive/legacy-landing/`
- no queda otra carpeta `Signal` separada

## Mejoras aplicadas (auditoría Mayo 2026)

Auditoría completa del 10 de mayo. 5 de 5 issues corregidos, frontend modularizado.

### Fixes cerrados

1. ✅ **Redeploy Arena** — `emergencyRefund` ahora es permissionless (antes `onlyOwner`). Nuevo Arena: `0xB10FaBc2DFa536E4F0d853057e83663e91Bdd74B`. Bytecode verificado: match exacto con local.
2. ✅ **LAUNCH_CHECKLIST corregido** — "19 tests" → "23 tests".
3. ✅ **calculatePayout sin floating point** — `utils.js` usa math entera como Solidity.
4. ✅ **buildExploreDisplayDuels sin duplicados** — eliminado relleno cíclico de cards.
5. ✅ **Modularización de app.js** — De 1,203 líneas monolíticas a 6 archivos (1,281 líneas total):

| Archivo | Líneas | Responsabilidad |
|---------|--------|-----------------|
| `state.js` | 99 | Constantes, ABIs, appState, carga de config |
| `utils.js` | 360 | Formatos, math exacta, markup builders |
| `data.js` | 284 | Lectura on-chain, construcción de modelos |
| `render.js` | 363 | Renderizado de las 5 páginas |
| `wallet.js` | 132 | Wallet, transacciones, interacciones |
| `app.js` | 43 | Entry point, init(), refreshApp() |

### Extras

- Wallet en red incorrecta ya no crashea (modo solo lectura)
- RPC cambiado de 1rpc.io → publicnode.com (sin rate limits)
- Seed de demo ligero (1 duelo, 50 SIGNAL, costo mínimo)
- Scripts nuevos: `scripts/seed-light.js`, `scripts/seed-settle.js`, `scripts/seed-claim.js`, `scripts/claim-winnings.js`, `scripts/check-duel.js`

### Estado live en Sepolia (Mayo 10, 2026)

| Campo | Valor |
|-------|-------|
| Owner ETH | 0.099 ETH |
| Owner SIGNAL | 99,969,974 |
| `duelCount` | 1 |
| `agentCount` | 3 (doomgpt, bulltard, weatherwiz) |
| Arena SIGNAL balance | 1.0 (fee 2% de duelo #1) |
| Bettor demo SIGNAL | 25 |
| Tests | 23/23 passing |

### Duelo #1 — Completado

| Campo | Valor |
|-------|-------|
| Tema | BTC cierra mayo 2026 arriba de $100K |
| Agentes | doomgpt (A) vs bulltard (B) |
| Pool | 50 SIGNAL (25 cada lado) |
| Ganador | doomgpt |
| Fee Arena (2%) | 1 SIGNAL |
| Prize pool | 49 SIGNAL |
| Claim | Owner reclamó 49 SIGNAL ✅ |
| W/L | doomgpt 1/0, bulltard 0/1 |

## Próximos pasos

- [x] Redeploy Arena con emergencyRefund permissionless
- [x] Seed de demo ligero (1 duelo, 50 SIGNAL)
- [x] Modularizar app.js (6 archivos)
- [x] Settlear duelo #1
- [x] Claim winnings duelo #1
- [ ] Ejecutar demo-setup completo con 2-3 wallets
- [ ] Verificar contrato nuevo en Etherscan/Sourcify
- [ ] Agregar tests para SignalToken standalone
- [ ] Agregar loading states en UI
- [ ] Refactor styles.css
