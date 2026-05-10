# Migracion a Firebase Hosting

Fecha: 2026-05-10
Proyecto: `tobybots-arena`
Repo local: `/Users/antoin/Documents/tobybots`

## Actualizacion post-arreglos y redeploy

Despues del premium perception pass y la QA final, se hizo un nuevo deploy
correctivo a Firebase Hosting.

Estado actual confirmado:

- Deploy OK en `https://tobybots-arena.web.app`
- Build empaquetado desde `public/`
- `predictions.json` agregado al script de packaging para que el deploy incluya
  toda la metadata de predicciones usada por la UI
- Repo sincronizado con GitHub en `main`
- Commit publicado:
  - `315942b` — `Polish arena UX and publish hosting-ready build`

## Resumen

Se migro el sitio estatico de GitHub Pages a Firebase Hosting usando la cuenta de Firebase `Iliniza Games` (`ilinizagames@gmail.com`).

El sitio ya esta desplegado y funcionando en:

- `https://tobybots-arena.web.app`
- `https://tobybots-arena.firebaseapp.com`

Tambien se inicio la migracion del dominio custom `tobybots.com`.

## Lo que se confirmo del proyecto

- El sitio es estatico / client-side.
- No necesita servidor propio para publicarse.
- Los contratos y Hardhat no forman parte del hosting web.
- La app usa Sepolia y MetaMask desde frontend.

## Cambios hechos en el repo

Archivos agregados o configurados para Firebase Hosting:

- `/Users/antoin/Documents/tobybots/.firebaserc`
- `/Users/antoin/Documents/tobybots/firebase.json`
- `/Users/antoin/Documents/tobybots/scripts/prepare-hosting.sh`

Archivos modificados:

- `/Users/antoin/Documents/tobybots/package.json`
- `/Users/antoin/Documents/tobybots/.gitignore`

## Configuracion actual de hosting

La publicacion no sale desde la raiz del repo. Se preparo una carpeta generada `public/` para subir solo los archivos necesarios del sitio.

Configuracion clave:

- `firebase.json` usa `"public": "public"`
- `firebase.json` ejecuta `predeploy` con `npm run hosting:prepare`
- `package.json` incluye el script `hosting:prepare`
- `public/` esta ignorado en git

## Resultado del deploy

Deploy inicial:

- Firebase subio `341 files`
- Eso indicaba que la raiz del repo estaba demasiado expuesta

Deploy corregido:

- Firebase sube `22 files in public`
- Quedo mucho mas limpio y seguro

Deploy actual post-arreglos:

- Firebase sube `29 files in public`
- Incluye HTML, JS, CSS, metadata JSON y avatars SVG necesarios para la Arena

Comando de deploy para futuras publicaciones:

```bash
cd /Users/antoin/Documents/tobybots
npx firebase-tools deploy --only hosting
```

## Estado del dominio custom

Dominio en proceso de migracion:

- `tobybots.com`

En Firebase Hosting se agrego el dominio personalizado `tobybots.com` al proyecto `tobybots-arena`.

Firebase pidio estos cambios DNS:

Agregar:

- `A` para `tobybots.com` -> `199.36.158.100`
- `TXT` para `tobybots.com` -> `hosting-site=tobybots-arena`

Quitar:

- `A` `185.199.108.153`
- `A` `185.199.109.153`
- `A` `185.199.110.153`

## Cambios hechos en Name.com

Se eliminaron los registros `A` viejos de GitHub Pages en el apex.

Se agregaron estos registros nuevos:

- `A` apex -> `199.36.158.100`
- `TXT` apex -> `hosting-site=tobybots-arena`

## Verificacion hecha por terminal

Se verifico que los DNS ya responden asi:

```text
A: 199.36.158.100
TXT: "hosting-site=tobybots-arena"
WWW: vodooofilms.github.io.
```

## Estado actual exacto

Lo que ya funciona:

- Firebase Hosting del proyecto `tobybots-arena`
- Sitio publicado en `web.app`
- DNS apex de `tobybots.com` ya apuntando a Firebase
- TXT de verificacion ya publico

Lo que sigue pendiente:

- Esperar a que Firebase termine de verificar `tobybots.com`
- Mover `www.tobybots.com`, que todavia apunta al host viejo

## Punto importante pendiente

Todavia existe este registro viejo:

- `CNAME www.tobybots.com -> vodooofilms.github.io`

Eso significa que:

- `tobybots.com` ya va encaminado a Firebase
- `www.tobybots.com` sigue yendo al sitio viejo o a una configuracion heredada

## Siguiente paso recomendado

Cuando se retome la sesion:

1. Entrar a Firebase Hosting del proyecto `tobybots-arena`
2. Revisar si `tobybots.com` ya dejo de mostrar `Requiere configuracion`
3. Si Firebase ya verifico el apex, agregar tambien `www.tobybots.com` como dominio custom en Firebase
4. Cambiar el `CNAME` de `www` desde `vodooofilms.github.io` al destino que indique Firebase
5. Verificar que tanto `tobybots.com` como `www.tobybots.com` carguen la misma web
6. Confirmar que el certificado SSL ya este emitido

## Nota operativa

Durante la sesion, el panel de Firebase en Firefox se desoriento al refrescar y volvio al home, pero no se perdio configuracion. La comprobacion confiable se hizo por terminal con `dig`, y los registros correctos ya estaban publicados.

## Comandos utiles para la proxima sesion

Ver DNS:

```bash
dig +short A tobybots.com
dig +short TXT tobybots.com
dig +short CNAME www.tobybots.com
```

Rehacer deploy si hace falta:

```bash
cd /Users/antoin/Documents/tobybots
npx firebase-tools deploy --only hosting
```

Ver el estado HTTPS actual:

```bash
curl -I https://tobybots-arena.web.app
curl -I https://tobybots.com
```

## En una frase

La migracion de GitHub Pages a Firebase Hosting ya esta hecha; solo falta cerrar bien el dominio custom y mover `www` para terminar la salida completa del host viejo.
