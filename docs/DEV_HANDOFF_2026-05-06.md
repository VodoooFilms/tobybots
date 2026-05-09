# Dev Handoff — May 6, 2026

## One-sentence summary

`Signal` is the private product/dev repo. `tobybots` is a public brand/content repo. `vodooofilms.github.io` is the actual GitHub Pages repo that serves `tobybots.com`.

## Repo map

### 1. `Signal`

- Local path: `/Users/antoin/Documents/Signal`
- GitHub: `VodoooFilms/Signal`
- Visibility: `private`
- Purpose:
  - smart contracts
  - Sepolia deployment
  - arena frontend source
  - docs / handoff / audits

Important:
- this is the source of truth for the arena product
- the live arena pages were built from `Signal/site/*`

### 2. `tobybots`

- Local path: `/Users/antoin/Documents/tobybots`
- GitHub: `VodoooFilms/tobybots`
- Visibility at end of session: `public`
- Purpose:
  - brand/marketing repo
  - editorial TobyBots content
  - not the final serving repo for the live domain anymore

Important:
- this repo caused confusion because it looked like the website repo
- it is **not** the repo currently serving `tobybots.com`
- it still contains a marketing/editorial version of the site, not the canonical live arena deploy target

### 3. `vodooofilms.github.io`

- Local path: `/Users/antoin/Documents/vodooofilms.github.io`
- GitHub: `VodoooFilms/vodooofilms.github.io`
- Visibility: `public`
- Purpose:
  - GitHub Pages serving repo for the custom domain
  - current deploy target for `tobybots.com`

Important:
- this is the repo GitHub Pages is actually using
- DNS for `www.tobybots.com` points to `vodooofilms.github.io`
- custom domain is controlled by `CNAME = tobybots.com`

## Domain map

### Canonical live domain

- `http://tobybots.com`

### Secondary domain

- `http://www.tobybots.com`

### What should serve the arena

- `vodooofilms.github.io` should serve the full arena site from `Signal/site/*`
- the root page should be the arena home from `Signal/site/index.html`
- supporting pages should include:
  - `explore.html`
  - `duel.html`
  - `agent.html`
  - `portfolio.html`
  - `how-it-works.html`
  - `app.js`
  - `styles.css`

## What caused the confusion

There were two different website concepts:

1. an editorial/marketing page based on `Signal/site/how-it-works.html`
2. the actual arena app based on `Signal/site/index.html`

The editorial page was briefly published to the root domain by mistake. After that, the deploy target was corrected so the root domain should serve the arena app instead.

Also, there was repo confusion:

1. `tobybots` looked like the website repo
2. but `www.tobybots.com` DNS actually pointed to `vodooofilms.github.io`
3. so publishing only to `tobybots` was not enough

## Final intended architecture after this session

### Product source

- Use `Signal/site/*` as the source for the arena website

### Public deploy target

- Publish the built/static arena site into `VodoooFilms/vodooofilms.github.io`

### Brand repo

- Keep `VodoooFilms/tobybots` for brand/editorial work only unless intentionally repurposed later

## Current website publishing state

### Arena source commit status

The arena files exist in:

- `/Users/antoin/Documents/Signal/site/index.html`
- `/Users/antoin/Documents/Signal/site/explore.html`
- `/Users/antoin/Documents/Signal/site/duel.html`
- `/Users/antoin/Documents/Signal/site/agent.html`
- `/Users/antoin/Documents/Signal/site/portfolio.html`
- `/Users/antoin/Documents/Signal/site/how-it-works.html`
- `/Users/antoin/Documents/Signal/site/app.js`
- `/Users/antoin/Documents/Signal/site/styles.css`

### Pages repo deploy history

- `5129886` — `Publish TobyBots x SIGNAL site`
  - published the editorial/marketing page
- `0650302` — `Publish Toby Bots Arena site`
  - published the full arena site to the Pages repo

### Important interpretation

If `tobybots.com` still shows the editorial page or a stale page, that is a Pages/cache/build propagation issue, not a repo-content issue. The latest intended deploy in the Pages repo is the arena site.

## Signal product status

Contracts:

- `$SIGNAL`: `0x7cfBB6a8b34F4E247bb4d82ec15463EB7c9A83A3`
- `Arena`: `0x0Ec0F1a5BaE2f6DC829D2f72ffB4d962C83b1EC1`
- Both verified on Sepolia Etherscan / Sourcify

Local contract improvement not live yet:

- `contracts/Arena.sol` allows permissionless `emergencyRefund()` after `settleDeadline`
- covered in `test/Arena.test.js`
- not redeployed to Sepolia yet

Reason:

- owner wallet ETH is too low for comfortable redeploy / migration
- observed May 6, 2026 balance:
  - `0.000991372021605331 ETH`

## Arena frontend status

In `Signal/site/*`:

- `app.js` reads live Sepolia state
- wallet connect is wired
- `approve + bet` is wired
- `claimWinnings` is wired
- `claimRefund` is wired
- `emergencyRefund` is wired
- activity query was capped to a recent block window to avoid RPC log-range failures
- links were converted to relative paths so the site works on both `localhost` and `file://`

## What to do next in future sessions

### If checking the live website

1. First inspect `VodoooFilms/vodooofilms.github.io`
2. Confirm `index.html` there is the arena home, not the editorial page
3. Then check `tobybots.com`
4. Treat `www.tobybots.com` separately because it may lag the root domain

### If editing the arena website

1. Edit files in `Signal/site/*`
2. Verify locally
3. Copy/publish the static output into `vodooofilms.github.io`
4. Do not assume editing `tobybots` changes the live domain

### If editing the TobyBots brand site

1. Work in `tobybots`
2. Treat it as separate from the live arena deploy path unless you intentionally change the architecture

## Anti-confusion rules

For future sessions, assume these rules unless explicitly changed:

1. `Signal` = private dev/product source
2. `Signal/site/index.html` = arena home source
3. `tobybots` = brand/editorial repo, not live deploy target
4. `vodooofilms.github.io` = actual live Pages repo for `tobybots.com`
5. If root domain content looks wrong, check the Pages repo commit and Pages build state before changing product code
