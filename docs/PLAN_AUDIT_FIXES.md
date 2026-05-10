# Plan: Resolución de Issues de Auditoría

> **Para ejecutar:** Usar `subagent-driven-development` task por task. O ejecutar manualmente en orden.

**Meta:** Resolver los 8 issues de auditoría en orden de prioridad, minimizando consumo de gas en Sepolia. Todo se prueba localmente.

**Principio:** Los issues 1-5 son cambios locales sin tocar la chain. El issue del Arena desplegado (emergencyRefund) se documenta y se pospone a una futura migración.

**Stack:** Vanilla JS, HTML, CSS, Markdown, GitHub Actions YAML. Sin dependencias nuevas.

---

## Task 1: Corregir FAQ — withdrawFees no transfiere todo el balance

**Objetivo:** Eliminar la frase incorrecta de FAQ.md línea 328.

**Archivos:**
- Modificar: `FAQ.md:326-329`

**Paso 1: Editar el FAQ**

Reemplazar las líneas 326-329 actuales:

```
`withdrawFees()` retira únicamente `accruedFees`. Aun así, para operación de demo conviene ejecutarlo solo cuando ya terminó el flujo que quieres mostrar.

Transfiere todo el balance de $SIGNAL del Arena al owner.
```

Por:

```
`withdrawFees()` retira únicamente los fees acumulados (`accruedFees`), no toca el escrow de duelos abiertos. Para operación de demo conviene ejecutarlo solo cuando ya no hay duelos activos que mostrar.
```

**Paso 2: Verificar**

```bash
grep -n "Transfiere todo el balance" /Users/antoin/Documents/tobybots/FAQ.md
# Debe devolver vacío (sin resultados)
```

**Paso 3: Commit**

```bash
cd /Users/antoin/Documents/tobybots
git add FAQ.md
git commit -m "docs: corregir FAQ sobre withdrawFees (solo accruedFees, no balance completo)"
```

---

## Task 2: Extraer configuración de contratos a archivo separado

**Objetivo:** Mover direcciones hardcodeadas de `app.js` a un `config.json` para que tras un redeploy solo se edite un archivo.

**Archivos:**
- Crear: `config.json`
- Modificar: `app.js:3-9` (bloque CHAIN)
- Modificar: `index.html:113` (agregar script de carga de config)

**Paso 1: Crear config.json**

```json
{
  "chain": {
    "id": 11155111,
    "name": "Sepolia",
    "rpcUrl": "https://1rpc.io/sepolia",
    "signalToken": "0x7cfBB6a8b34F4E247bb4d82ec15463EB7c9A83A3",
    "arena": "0x0Ec0F1a5BaE2f6DC829D2f72ffB4d962C83b1EC1"
  }
}
```

**Paso 2: Modificar app.js — eliminar CHAIN hardcodeado y cargar desde config.json**

Reemplazar el bloque de líneas 3-9:

```js
const CHAIN = {
  id: 11155111,
  name: "Sepolia",
  rpcUrl: "https://1rpc.io/sepolia",
  signalToken: "0x7cfBB6a8b34F4E247bb4d82ec15463EB7c9A83A3",
  arena: "0x0Ec0F1a5BaE2f6DC829D2f72ffB4d962C83b1EC1"
};
```

Por:

```js
let CHAIN = {
  id: 11155111,
  name: "Sepolia",
  rpcUrl: "https://1rpc.io/sepolia",
  signalToken: "0x7cfBB6a8b34F4E247bb4d82ec15463EB7c9A83A3",
  arena: "0x0Ec0F1a5BaE2f6DC829D2f72ffB4d962C83b1EC1"
};

try {
  const configRes = await fetch("./config.json");
  if (configRes.ok) {
    const config = await configRes.json();
    if (config.chain) CHAIN = config.chain;
  }
} catch (e) {
  console.warn("Usando configuración por defecto (config.json no encontrado)");
}
```

**Paso 3: Verificar que la app sigue funcionando**

```bash
cd /Users/antoin/Documents/tobybots && python3 -m http.server 8000 &
# Abrir http://localhost:8000 en navegador
# Verificar que el home carga datos (duelos, agentes)
# Revisar consola: sin errores de carga de config.json
```

**Paso 4: Commit**

```bash
git add config.json app.js
git commit -m "refactor: extraer config de contratos a config.json"
```

---

## Task 3: Separar metadata de agentes de app.js

**Objetivo:** Mover `AGENT_METADATA` de app.js a `agents.json` para que agregar/quitar agentes no requiera editar JS.

**Archivos:**
- Crear: `agents.json`
- Modificar: `app.js:38-75` (AGENT_METADATA + merge con fallback)

**Paso 1: Crear agents.json**

```json
{
  "doomgpt": {
    "category": "Toby Original",
    "verified": true,
    "origin": "Toby",
    "tagline": "Sees breakdowns before they trend."
  },
  "bulltard": {
    "category": "Toby Original",
    "verified": true,
    "origin": "Toby",
    "tagline": "Always long. Occasionally right."
  },
  "weatherwiz": {
    "category": "Toby Original",
    "verified": true,
    "origin": "Toby",
    "tagline": "Storm paths, pressure maps, zero drama."
  },
  "hermes": {
    "category": "Guest Agent",
    "verified": true,
    "origin": "External",
    "tagline": "Reads the market before the market reads itself."
  },
  "clawbot": {
    "category": "Partner Agent",
    "verified": true,
    "origin": "Partner",
    "tagline": "Fast, sharp, and allergic to hesitation."
  },
  "pi": {
    "category": "Community Agent",
    "verified": false,
    "origin": "Community",
    "tagline": "Quiet math, sharp outcomes."
  }
}
```

**Paso 2: Modificar app.js — cargar metadata desde agents.json con fallback**

Reemplazar el bloque AGENT_METADATA (líneas 38-75):

```js
const AGENT_METADATA = {
  doomgpt: {
    category: "Toby Original",
    verified: true,
    origin: "Toby",
    tagline: "Sees breakdowns before they trend."
  },
  bulltard: {
    ...
  },
  ...
};
```

Por:

```js
const AGENT_METADATA_FALLBACK = {
  doomgpt: { category: "Toby Original", verified: true, origin: "Toby", tagline: "Sees breakdowns before they trend." },
  bulltard: { category: "Toby Original", verified: true, origin: "Toby", tagline: "Always long. Occasionally right." },
  weatherwiz: { category: "Toby Original", verified: true, origin: "Toby", tagline: "Storm paths, pressure maps, zero drama." },
  hermes: { category: "Guest Agent", verified: true, origin: "External", tagline: "Reads the market before the market reads itself." },
  clawbot: { category: "Partner Agent", verified: true, origin: "Partner", tagline: "Fast, sharp, and allergic to hesitation." },
  pi: { category: "Community Agent", verified: false, origin: "Community", tagline: "Quiet math, sharp outcomes." }
};

let AGENT_METADATA = AGENT_METADATA_FALLBACK;

try {
  const agentsRes = await fetch("./agents.json");
  if (agentsRes.ok) {
    const agentsJson = await agentsRes.json();
    AGENT_METADATA = { ...AGENT_METADATA_FALLBACK, ...agentsJson };
  }
} catch (e) {
  console.warn("Usando metadata de agentes por defecto (agents.json no encontrado)");
}
```

**Paso 3: Verificar**

```bash
# Servir y abrir http://localhost:8000/agent.html?id=1
# Verificar que doomgpt muestra "Original Toby" y su tagline
# Abrir http://localhost:8000/explore.html
# Verificar que los agentes tienen categorías y badges correctos
```

**Paso 4: Commit**

```bash
git add agents.json app.js
git commit -m "refactor: extraer metadata de agentes a agents.json"
```

---

## Task 4: Agregar CI/CD con GitHub Actions

**Objetivo:** Que cada push a main ejecute compilación y tests automáticamente.

**Archivos:**
- Crear: `.github/workflows/ci.yml`

**Paso 1: Crear el workflow**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx hardhat compile
      - run: npm test
```

**Paso 2: Verificar localmente (simulado)**

```bash
cd /Users/antoin/Documents/tobybots
npm ci 2>&1 | tail -1  # debe decir "up to date" o instalar sin errores
npx hardhat compile 2>&1  # "Nothing to compile" o éxito
npm test 2>&1 | tail -1   # "23 passing"
```

**Paso 3: Commit y push**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: agregar GitHub Actions workflow (compile + test)"
```

**Paso 4: Verificar en GitHub**

Ir a `https://github.com/<user>/<repo>/actions` después del push y confirmar que el workflow pasa.

---

## Task 5: Verificar emergencyRefund en el Arena desplegado

**Objetivo:** Determinar si el Arena en Sepolia ya tiene emergencyRefund permissionless o necesita redeploy.

**Archivos:**
- Ejecutar: `scripts/verify-deploy.js` (ya lo tenemos)
- Actualizar: `docs/DEPLOYMENT.md:89-95` (si el estado cambió)

**Paso 1: Intentar emergencyRefund desde una wallet no-owner (simulación local)**

```bash
cd /Users/antoin/Documents/tobybots
# El verify-deploy.js ya muestra el estado. Para verificar el permiso real,
# se necesita una wallet no-owner con ETH y un duelo expirado en Sepolia.
# Como prueba mínima: revisar el bytecode desplegado vs local.
npx hardhat compile
# Comparar: el bytecode en Sepolia (Etherscan) vs artifacts/contracts/Arena.sol/Arena.json
# Si son idénticos, el código desplegado ya tiene emergencyRefund permissionless.
```

**Paso 2: Marcar en DEPLOYMENT.md**

Si el código desplegado coincide con el local (mismo bytecode), eliminar la nota de "no live yet":

```markdown
- `emergencyRefund()` es permissionless tanto en local como en Sepolia ✅
```

Si no coincide, mantener la nota y agregar fecha estimada de migración.

**Paso 3: Commit**

```bash
git add docs/DEPLOYMENT.md
git commit -m "docs: actualizar estado de emergencyRefund en Sepolia"
```

---

## Task 6 (opcional): Actualizar LAUNCH_CHECKLIST — quitar items cumplidos

**Objetivo:** Marcar los items del checklist que ya se completaron con este plan.

**Archivos:**
- Modificar: `docs/LAUNCH_CHECKLIST.md`

**Items a marcar:**

```markdown
- [x] `emergencyRefund` returns real funds (was empty before)  # ya verificado en tests
- [x] FAQ actualizado (withdrawFees documentado correctamente)
- [x] Config de contratos extraída a config.json
- [x] Metadata de agentes en agents.json
- [x] CI/CD con GitHub Actions (compile + test en cada push)
```

**Paso 1: Editar y commit**

```bash
git add docs/LAUNCH_CHECKLIST.md
git commit -m "docs: actualizar launch checklist con issues resueltos"
```

---

## Resumen de orden

| # | Task | Toca chain? | Tiempo estimado |
|---|------|-------------|-----------------|
| 1 | Corregir FAQ | No | 1 min |
| 2 | Extraer config.json | No | 5 min |
| 3 | Extraer agents.json | No | 5 min |
| 4 | Agregar CI/CD | No | 5 min |
| 5 | Verificar emergencyRefund | Solo lectura | 3 min |
| 6 | Actualizar checklist | No | 2 min |

**Total: ~20 minutos. Cero gas en Sepolia.** Todo se prueba con `python3 -m http.server 8000` y `npm test`.

---

## Lo que queda para después (requiere Sepolia)

- Redeploy del Arena si emergencyRefund no está permissionless (requiere cambiar direcciones en config.json y frontend)
- Fondear wallets demo con SIGNAL
- Crear y settlear duelos de demo
- Probar el frontend contra Sepolia con wallet real
