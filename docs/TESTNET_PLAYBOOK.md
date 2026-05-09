# Testnet Playbook — Toby Bots Arena

Cómo preparar y correr una demo funcional en Sepolia sin improvisar.

## Demo mínima recomendada

Para que la demo no se vea "pelada", prepará estas tres wallets y dos duelos:

- `owner/admin`: wallet que controla el deploy y hace `settle`
- `bettor A`: wallet de prueba para apostar por un bot
- `bettor B`: wallet de prueba para apostar por el otro bot

Estado mínimo antes de mostrar:

- 1 duelo `Open` visible para que se entienda el producto en vivo
- 1 duelo `Settled` visible con al menos 1 claim exitoso
- 2 wallets de prueba con ETH y $SIGNAL

Orden recomendado:

1. Fondear `bettor A` y `bettor B`
2. Crear duelo #1 con duración mínima (`3600`) y meter apuestas en ambos lados
3. Esperar 1 hora, hacer `settle`, y ejecutar al menos 1 `claimWinnings`
4. Crear duelo #2 y dejarlo `Open` para mostrar el estado activo en la UI

Importante:

- El contrato exige `betDurationSeconds >= 1 hours`, así que no existe un duelo "instant settle"
- El owner es el único que puede `settle`
- `emergencyRefund` puede llamarlo cualquier wallet después del `settleDeadline`
- Cada wallet solo puede apostar una vez por duelo

## Prerequisitos

### 1. Billetera

Necesitás MetaMask (o cualquier wallet Ethereum) configurada para Sepolia.

Si no la tenés, agregá Sepolia manualmente:
- Network Name: `Sepolia Testnet`
- RPC URL: `https://1rpc.io/sepolia`
- Chain ID: `11155111`
- Symbol: `ETH`
- Block Explorer: `https://sepolia.etherscan.io`

### 2. ETH de testnet

Faucets (en orden de confiabilidad):
- https://www.alchemy.com/faucets/ethereum-sepolia (requiere registro)
- https://cloud.google.com/application/web3/faucet/ethereum/sepolia
- https://sepolia-faucet.pk910.de/ (PoW)

Necesitás mínimo 0.01 ETH por transacción. Con 0.05 ETH alcanza para varias operaciones.

Estado actual del owner el May 6, 2026:

- balance observado: `0.000991372021605331 ETH`
- acción requerida: recargar Sepolia ETH antes de preparar otra demo

### 3. $SIGNAL tokens

Pedile al owner (deployer) que te transfiera $SIGNAL, o usá la wallet del owner directamente si estás testeando como admin.

### 4. Direcciones que vas a usar

| Rol | Recomendación |
|-----|---------------|
| `owner/admin` | `0xC242829F7A7Fd6fe910738fe165ce5D19c1448FA` |
| `bettor A` | wallet nueva para demo |
| `bettor B` | wallet nueva para demo |

## Fondear wallets de prueba

### ETH de Sepolia

Monto sugerido por wallet:

- `owner/admin`: mantener arriba de `0.03 ETH`
- `bettor A`: `0.02–0.05 ETH`
- `bettor B`: `0.02–0.05 ETH`

Con eso alcanza para approve, bet y claim sin fricción.

### $SIGNAL para demo

Monto sugerido por wallet:

- `bettor A`: `2,000 SIGNAL`
- `bettor B`: `2,000 SIGNAL`

El owner está whitelisted en `$SIGNAL`, así que puede transferir tokens a wallets demo sin pagar el fee del 1%.

Paso a paso:

1. Conseguí ETH de Sepolia para cada wallet usando uno de los faucets listados arriba
2. Desde la wallet owner, abrí Etherscan en `$SIGNAL` → `Write Contract` → `transfer`
3. Transferí `2000000000000000000000` a cada wallet de prueba (`2000 * 10^18`)
4. En MetaMask de cada tester, importá el token con la dirección `0x7cfBB6a8b34F4E247bb4d82ec15463EB7c9A83A3`

Chequeo rápido:

- cada wallet ve ETH en Sepolia
- cada wallet ve saldo de `$SIGNAL`
- cada wallet puede conectar Etherscan/MetaMask sin pedir setup adicional

## Runbook: 1 duelo abierto + 1 duelo settled

Esta es la preparación mínima recomendada para una demo creíble.

### Duelo #1: historial settled

Objetivo:

- que exista un ejemplo ya resuelto
- que al menos una wallet haya cobrado
- que se vean stats W/L de agentes movidas desde `0/0`

Nota de estado:

- hoy Sepolia ya tiene `2` duelos creados
- revisá `duelCount()` antes de asumir que este flujo empieza desde cero

#### Paso 1: crear el duelo

En Etherscan → Arena contract → `Write Contract` → `createDuel`:

```text
agentAId:           1
agentBId:           2
eventDescription:   "BTC cierra por encima de $120K antes del 1 de junio de 2026"
betDurationSeconds: 3600
```

Notas:

- `1 = doomgpt`
- `2 = bulltard`
- `3600` es la duración mínima válida

#### Paso 2: meter apuestas en ambos lados

`bettor A`:

1. `$SIGNAL` → `approve`
2. Arena → `bet`

```text
approve.spender: 0x0Ec0F1a5BaE2f6DC829D2f72ffB4d962C83b1EC1
approve.amount:  500000000000000000000

bet.duelId:      1
bet.agentId:     1
bet.amount:      500000000000000000000
```

`bettor B`:

```text
approve.spender: 0x0Ec0F1a5BaE2f6DC829D2f72ffB4d962C83b1EC1
approve.amount:  300000000000000000000

bet.duelId:      1
bet.agentId:     2
bet.amount:      300000000000000000000
```

Resultado esperado:

- pool A: `500 SIGNAL`
- pool B: `300 SIGNAL`
- total pot: `800 SIGNAL`

#### Paso 3: esperar el cierre y hacer settle

Esperá a que pase `betDeadline`. Después:

En Etherscan → Arena → `settle`:

```text
duelId:         1
winnerAgentId:  1
```

Con esos números:

- fee del Arena: `16 SIGNAL` (2% de 800)
- prize pool: `784 SIGNAL`
- payout de `bettor A`: `784 SIGNAL`

#### Paso 4: ejecutar al menos 1 claim

Desde `bettor A`, en Arena → `claimWinnings`:

```text
duelId: 1
```

Chequeo esperado:

- `bettor A` termina con `+284 SIGNAL` netos sobre su apuesta de 500
- `bettor B` puede intentar `claimWinnings`, pero no cobra nada
- stats: `doomgpt` suma 1 win, `bulltard` suma 1 loss

### Duelo #2: abierto para mostrar producto en vivo

Objetivo:

- dejar algo visible en estado `Open`
- que el usuario vea que todavía se puede apostar

Crear un segundo duelo después de resolver el #1:

```text
agentAId:           2
agentBId:           3
eventDescription:   "¿Lluvia extrema en Miami antes del 15 de mayo de 2026?"
betDurationSeconds: 86400
```

Notas:

- `2 = bulltard`
- `3 = weatherwiz`
- `86400` deja una ventana de 24 horas para demo y screenshots

Opcional pero recomendado:

- meter una apuesta chica (`100 SIGNAL`) desde una sola wallet para que el mercado abierto no esté vacío
- no hacer `settle` todavía; dejalo vivo para la demo

---

## Flujo 1: Apostar en un duelo (usuario)

### Paso 1: Crear un duelo (owner)

Andá a Etherscan → Arena contract → Write Contract → `createDuel`:

```
agentAId:        1               (doomgpt)
agentBId:        2               (bulltard)
eventDescription: "ETH supera los 5K el 15 de mayo"
betDurationSeconds: 3600         (1 hora)
```

Esto abre un duelo con 1 hora de ventana de apuestas.

### Paso 2: Aprobar $SIGNAL para el Arena (usuario)

En Etherscan → $SIGNAL contract → Write Contract → `approve`:

```
spender: 0x0Ec0F1a5BaE2f6DC829D2f72ffB4d962C83b1EC1   (Arena)
amount:  500000000000000000000                           (500 $SIGNAL en wei)
```

O desde MetaMask: importar token $SIGNAL con la dirección `0x7cfBB6a8b34F4E247bb4d82ec15463EB7c9A83A3` y hacer approve desde la UI.

### Paso 3: Apostar (usuario)

En Etherscan → Arena contract → Write Contract → `bet`:

```
duelId:  1
agentId: 1     (1 = doomgpt, 2 = bulltard)
amount:  500000000000000000000
```

### Paso 4: Esperar a que cierre la ventana

El `betDeadline` es 1 hora después de crear el duelo. Podés ver el deadline en Etherscan → Arena → Read Contract → `duels(1)`.

### Paso 5: Resolver el duelo (owner)

En Etherscan → Arena contract → Write Contract → `settle`:

```
duelId:         1
winnerAgentId:  1
```

Solo funciona si ya pasó `betDeadline` y todavía no pasó `settleDeadline` (14 días).

### Paso 6: Cobrar ganancia (usuario)

En Etherscan → Arena contract → Write Contract → `claimWinnings`:

```
duelId: 1
```

Si apostaste al ganador, recibís payout proporcional. Si no, no recibís nada.

---

## Flujo 2: Emergency Refund

Si un duelo no se resuelve antes de `settleDeadline` (betDeadline + 14 días):

### Paso 1: Ejecutar refund (cualquier wallet)

En Etherscan → Arena contract → Write Contract → `emergencyRefund`:

```
duelId: 1
```

Esto devuelve todas las apuestas a sus dueños originales.

### Paso 2: Verificar reembolso (usuario)

Cada usuario debe llamar `claimRefund(duelId)` para recuperar su apuesta. El refund no vuelve automáticamente a la wallet.

---

## Flujo 3: Owner withdraws fees

Después de resolver duelos, los fees (2% del pot) quedan en el Arena.

En Etherscan → Arena contract → Write Contract → `withdrawFees`:

```
(sin argumentos)
```

`withdrawFees()` retira únicamente `accruedFees`. Aun así, para operación de demo conviene ejecutarlo solo cuando ya terminó el flujo que quieres mostrar.

Transfiere todo el balance de $SIGNAL del Arena al owner.

---

## Addresses Rápidas

| Contrato | Dirección |
|----------|-----------|
| $SIGNAL | `0x7cfBB6a8b34F4E247bb4d82ec15463EB7c9A83A3` |
| Arena | `0x0Ec0F1a5BaE2f6DC829D2f72ffB4d962C83b1EC1` |

### Agentes seed

| ID | Nombre | Especialidad |
|----|--------|-------------|
| 1 | doomgpt | Crypto macro |
| 2 | bulltard | Hopium futures |
| 3 | weatherwiz | Climate events |

---

## Notas

- Cada dirección solo puede apostar **una vez** por duelo (restricción v1).
- Las apuestas son en $SIGNAL, no en ETH.
- El Arena está whitelisted en $SIGNAL → las transferencias hacia/desde el Arena no pagan el 1% de fee.
- El owner también está whitelisted en `$SIGNAL`, así que puede fondear wallets demo sin fee.
- El owner (deployer) es el único que puede `settle`.
- Si un duelo expira sin settlement, cualquier wallet puede llamar `emergencyRefund`. Después cada usuario debe llamar `claimRefund`.
