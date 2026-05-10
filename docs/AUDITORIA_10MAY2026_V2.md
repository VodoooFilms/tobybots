# TobyBots Arena — Auditoría — 10 Mayo 2026 (16:00 UTC)

## Resumen ejecutivo

Auditoría completa post-migración a Firebase + sesión con otro agente.
Se verificó estado on-chain, DNS, Firebase Hosting, código fuente, tests y documentación.
**El proyecto está deployado, migrado, funcional y con 2 duelos nuevos no documentados.**

═══════════════════════════════════════════════
## ESTADO ON-CHAIN vs REPORTE ANTERIOR
═══════════════════════════════════════════════

| Métrica | Reporte (previo) | Actual | Delta |
|---------|-----------------|--------|-------|
| duelCount | 1 | **3** | +2 |
| Arena SIGNAL balance | 1.0 | **101.0** | +100 |
| Owner SIGNAL | ~99,969,974 | 99,969,824 | -150 |
| Owner ETH | 0.099 | 0.0948 | -0.004 |
| Tests | 23/23 | 23/23 | =

### Duelos actuales

| # | Estado | Agentes | Descripción | Pool |
|---|--------|---------|-------------|------|
| 1 | Settled | doomgpt vs bulltard | BTC cierra mayo > $100K | 50 SIGNAL |
| 2 | **Open** | doomgpt vs bulltard | BTC cierra mayo > $100K | 50 SIGNAL |
| 3 | **Open** | weatherwiz vs bulltard | ¿Lluvia extrema Miami antes 15 mayo? | 50 SIGNAL |

Duelo #1: ganó doomgpt, 49 SIGNAL cobrados, 1 SIGNAL fee en Arena.
Duelos #2 y #3: creados después del reporte, no referenciados en docs.

### Agentes on-chain

| ID | Nombre | W/L | Specialty |
|----|--------|-----|-----------|
| 1 | doomgpt | 1/0 | Crypto macro |
| 2 | bulltard | 0/1 | Hopium futures |
| 3 | weatherwiz | 0/0 | Climate events |

═══════════════════════════════════════════════
## MIGRACIÓN A FIREBASE — VERIFICACIÓN
═══════════════════════════════════════════════

### DNS — COMPLETO ✅

| Registro | Valor | Estado |
|----------|-------|--------|
| A tobybots.com | 199.36.158.100 | ✅ Firebase |
| TXT tobybots.com | hosting-site=tobybots-arena | ✅ Verificado |
| CNAME www.tobybots.com | tobybots-arena.web.app | ✅ Migrado |

El doc `FIREBASE_MIGRATION_2026-05-10.md` decía que www todavía apuntaba a
`vodooofilms.github.io` — **esto ya fue corregido por el otro agente**.
Ambos dominios (apex + www) sirven desde Firebase con SSL.

### Firebase deploy

- URL: https://tobybots-arena.web.app → HTTP 200 ✅
- URL: https://tobybots.com → HTTP 200 ✅ (mismo etag)
- URL: https://www.tobybots.com → HTTP 200 ✅ (mismo etag)
- 29 archivos en `public/`
- `predictions.json` incluido en el build ✅

═══════════════════════════════════════════════
## CÓDIGO — AUDITORÍA
═══════════════════════════════════════════════

### Arquitectura frontend (sin cambios)

```
state.js     181 líneas — constantes, ABIs, appState, carga de config
utils.js     471 líneas — formatos, math exacta, markup builders
data.js      346 líneas — lectura on-chain, construcción de modelos
render.js    426 líneas — renderizado de 5 páginas
wallet.js    132 líneas — wallet, transacciones, interacciones
app.js        43 líneas — entry point, init(), refreshApp()
─────────────────
TOTAL      1,599 líneas
```

**Veredicto del código**: limpio, bien modularizado, sin dependencias circulares,
sin código muerto, errores de consola: 0.

### Issues #1-#5 de la auditoría anterior — todos resueltos ✅
### Issue #13 (.gitignore sin .DS_Store) — resuelto ✅

═══════════════════════════════════════════════
## ISSUES ENCONTRADOS
═══════════════════════════════════════════════

### ALTOS (2)

**A1 — DEPLOYMENT.md con datos stale**
RPC dice `https://1rpc.io/sepolia` (línea 6), real es `publicnode.com`.
"19 tests" (línea 90), real son 23.
ETH balance dice ~0.10, real es 0.0948.
Archivo: `docs/DEPLOYMENT.md`

**A2 — LAUNCH_CHECKLIST.md desactualizado**
Línea 62: "the live Sepolia Arena has not been redeployed yet" — FALSO, se redeployó.
Línea 29: RPC dice 1rpc.io, real es publicnode.com.
Línea 90: "0.000991... ETH" — real es 0.0948.
Archivo: `docs/LAUNCH_CHECKLIST.md`

### MEDIOS (3)

**M1 — predictions.json solo cubre duelo #1**
Duelos #2 y #3 no tienen prediction metadata → la UI muestra "Official prediction pending"
en lugar de predicciones reales. La experiencia de demo se degrada.
Archivo: `predictions.json`

**M2 — agents.json define 6 agentes, solo 3 on-chain**
Hermes, clawbot y pi están en metadata pero no existen en el contrato.
Si la UI intenta mostrarlos, aparecerán sin datos reales.
Archivo: `agents.json`

**M3 — CNAME file stale deployado a Firebase**
`CNAME` contiene `tobybots.com` para GitHub Pages. Se copia a `public/` en
`prepare-hosting.sh`. Firebase ignora este archivo, pero es ruido en el deploy.
Archivos: `CNAME`, `scripts/prepare-hosting.sh`

### BAJOS (4)

**B1 — how-it-works.html con CSS inline** (mismo issue #12 del reporte anterior)
**B2 — Sin favicon en páginas de la Arena** (mismo issue #11 del reporte anterior)
**B3 — styles.css monolítico (1477+ líneas)** (mismo issue #10 del reporte anterior)
**B4 — Sin tests dedicados para SignalToken standalone** (mismo issue #7 del reporte anterior)

═══════════════════════════════════════════════
## VERIFICACIONES
═══════════════════════════════════════════════

| Verificación | Resultado |
|-------------|-----------|
| `npm test` | 23/23 passing (408ms) |
| `npx hardhat compile` | OK |
| Bytecode Arena (15346 == 15346) | MATCH ✅ |
| RPC publicnode.com | Responde ✅ |
| DNS apex | Firebase ✅ |
| DNS www | Firebase ✅ |
| SSL tobybots.com | HTTPS 200 ✅ |
| SSL www.tobybots.com | HTTPS 200 ✅ |
| CI/CD (GitHub Actions) | Configurado ✅ |

═══════════════════════════════════════════════
## RECOMENDACIONES PRIORIZADAS
═══════════════════════════════════════════════

1. **[ALTO]** Actualizar `DEPLOYMENT.md` y `LAUNCH_CHECKLIST.md` con datos reales
2. **[MEDIO]** Agregar predictions para duelos #2 y #3 en `predictions.json`
3. **[MEDIO]** Decidir: crear agentes hermes/clawbot/pi on-chain o quitarlos de agents.json
4. **[MEDIO]** Eliminar `CNAME` de `prepare-hosting.sh` (o quitar el archivo)
5. **[BAJO]** Settlear duelo #2 (misma pregunta que #1, ya resuelta — doomgpt ganó)
6. **[BAJO]** Agregar favicon, refactor CSS, tests SignalToken

═══════════════════════════════════════════════
## VEREDICTO FINAL
═══════════════════════════════════════════════

TobyBots Arena está en excelente estado. La migración a Firebase está completa
(incluyendo www), el código está limpio, los tests pasan, y el RPC es estable.
Los 2 issues ALTOS son documentación stale (no bloquean operación).
Los issues MEDIOS son mejoras de calidad de demo.

El proyecto demuestra madurez: CI/CD activo, 3 duelos on-chain con 101 SIGNAL
en escrow, frontend modularizado, y despliegue multi-dominio con SSL.

CALIFICACION: **8.5 / 10** — "Migrado, funcional, listo para demo.
Corregir docs y agregar predictions para pulir la experiencia."
