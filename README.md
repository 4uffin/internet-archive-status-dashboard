# Internet Archive status dashboard & Archive Tides

A live dashboard for the Internet Archive and the Wayback Machine, plus a forecast of the best times to archive ("Archive Tides"). It has two parts:

- **The dashboard**: a static web page. It runs its own live probes from your browser and works on its own.
- **The collector (optional)**: a scheduled GitHub Action that probes around the clock, records history, opens an incident issue when something breaks, and gives the dashboard real data to learn from.

Not affiliated with the Internet Archive.

## Files

| File | What it is |
|---|---|
| `index.html` | The dashboard: a single self-contained page. |
| `manifest.webmanifest`, `sw.js`, `icon-192.png`, `icon-512.png` | Optional. Make the dashboard installable as an app and give it an offline fallback. |
| `collect.mjs` | The collector script. |
| `.github/workflows/collect.yml` | Runs the collector every 5 minutes. |
| `README.md` | This file. |

Everything can live in one repository. Layout:

```
index.html
manifest.webmanifest
sw.js
icon-192.png
icon-512.png
collect.mjs
.github/workflows/collect.yml
README.md
```

## Quick start: dashboard only

1. Serve `index.html` (and, if you want the installable app, the four app files) from the same folder, for example with GitHub Pages. They refer to each other by relative paths. The app manifest's start page is the folder root, so keep the dashboard named `index.html`.
2. Open the page. Probes start immediately and repeat every 30 seconds while it is open.

You can also open `index.html` straight from disk. Desktop notifications and the app features need `https://` or `localhost`.

## Setting up the collector

1. Make the repo **public** and add `collect.mjs` and `.github/workflows/collect.yml` to the default branch.
2. Settings → Actions → General: allow workflows, and give the workflow token read and write permission.
3. Actions → "collect" → Run workflow once. This creates a `data` branch holding `data.json`.
4. In the dashboard's "Shared collector" box, paste `https://raw.githubusercontent.com/<you>/<repo>/data/data.json` and press Load (or Enter). The dashboard remembers it.
5. Optional: press "Copy link" to get a dashboard link with that URL built in. Opening a link ending in `#collector=<url>` fills it in and saves it for you.

## Using the dashboard

Hover anything for a short explanation. Highlights:

- **Service status**: seven probes from your browser. Each card shows latency, the endpoint's typical latency, and session uptime, plus a "second opinion" from the collector. A control probe (non-Archive sites) tells "the Archive is down" apart from "you're offline". "Slow" is judged against each endpoint's own 7-day baseline, so it needs about 2 hours of saved data to learn it (until then a flat 3 s rule applies).
- **Uptime history and incidents**: kept in this browser (IndexedDB) in 10-minute buckets for 90 days, but only while the page is open. "Export history" downloads it as JSON; "Clear local history" deletes it after asking.
- **Archive Tides**: a 0–100 score (low tide to storm surge), the calmest windows ahead, a next-24-hours chart, and a 7-day heatmap. Hatching and the optional numbers keep the heatmap readable without relying on color.
- **Forecast accuracy**: tests the forecast on days it hasn't seen. Needs about 10 days of collector data.
- **Quick save**: check whether a page is already archived and open Save Page Now for it. The Archive can only reach public pages.
- **Display settings** (top bar): theme (auto, dark, light), times in local or UTC, and scores shown or hidden.
- **Keys**: `R` refreshes; `Enter` runs Check or Load in the text boxes. Section links in the sub-bar jump around the page.
- **Alerts** (top bar): notifications when a service fails twice in a row, recovers, or the tide drops below a level you choose. These only work while the page is open; if notifications are blocked you get in-page messages instead. For alerts with the page closed, use the collector's incident issues below.
- **Install**: in a supported browser, use the install icon or menu item (iPhone: Share, then Add to Home Screen).

## What the collector probes

- **Core (also probed from your browser)**: Availability API, CDX index, Advanced Search, Metadata API, Open Library, and the archive.org and web.archive.org sites.
- **Deeper checks (collector only, since browsers can't verify content across sites)**: Wayback playback (renders a real snapshot and checks its content), item download (reads the first chunk of a small file from a storage node), the thumbnail service, and reachability of the Save Page Now and S3 upload front doors. The collector never saves a page or uploads anything.
- That's 12 requests per sample, 2 samples per run, a run every 5 minutes. Keep it polite and don't shorten the interval much.

## Alerts that work with the dashboard closed

The workflow opens a GitHub Issue (label `ia-incident`) when a service fails 2 runs in a row (about 10 minutes), adds a comment as services join or recover, and closes it when everything responds again.

- **Email**: on the repo, Watch → Custom → Issues. The issue list doubles as an incident history.
- **Phone or chat (optional)**: add a repository secret `NTFY_TOPIC` (an unguessable topic name, then subscribe in the ntfy app) and/or `WEBHOOK_URL` (a Discord or Slack incoming webhook). Optional repository variables: `NTFY_URL` for a self-hosted ntfy, `ALERT_AFTER` to change the 2-run threshold.
- **Test it**: Actions → "collect" → Run workflow → tick `test_alert`. It sends a test push and opens then closes a test issue.
- Alerts are suppressed when the runner's own control probes fail, so a GitHub-side network blip doesn't page you.

## Capture-activity signal

The collector also records how many captures the Archive indexes at each UTC hour for a handful of heavily archived pages (BBC, Reddit, NYT, Wikipedia's main page, CNN, Washington Post), via the public CDX API. It fetches one missing day per run, newest first, so the 28-day history fills in over a few hours and then adds one day per day. Days newer than 2 days are skipped because the CDX index lags behind the crawl.

This is a rough proxy: it mostly reflects the Archive's own crawl and save activity, not user traffic. The dashboard tests it against measured latency on days it hasn't seen, and the tide only gives it weight (20%) if it agrees.

## How the tide score works

It starts from a typical global traffic rhythm (US evenings and European afternoons are the busy swells), then blends in live latency (each endpoint compared with its own baseline) and measured hour-of-week patterns: the collector's 24/7 profile if connected, otherwise what this browser has seen. The Archive publishes no load figures, so this is an estimate, and latency is only a proxy for load. The "Forecast accuracy" panel shows how well it has actually done.

## Privacy and network use

The dashboard has no backend of its own. Its requests go to archive.org, web.archive.org, openlibrary.org, two connectivity-check hosts (gstatic.com and cloudflare.com), and the collector URL you provide, if any. History and settings stay in your browser's storage.

## Notes and limits

- Collector data is kept for 21 days in 10-minute buckets (capture data for 28 days). Each run force-pushes one commit to the `data` branch, so the repo doesn't grow.
- Scheduled runs are best-effort (often a few minutes late), and GitHub may pause schedules on inactive repos; re-enable them from the Actions tab if that happens.
- `raw.githubusercontent.com` caches for a few minutes, so the dashboard can be about 5 to 10 minutes behind the collector.
- Probes run from GitHub's datacenters, so absolute latencies differ from yours. The dashboard only compares each endpoint with its own normal, so that's fine.
- The collector profile needs roughly a week of data before it takes over from the traffic model, and the accuracy panel needs about 10 days.

## Troubleshooting

- **"Couldn't load that URL" in the collector box**: use the raw `data.json` URL on the `data` branch, make sure the repo is public, and run the workflow once first.
- **Page looks out of date after an update**: hard refresh (Ctrl/Cmd+Shift+R).
- **No notifications**: they need permission and `https://` or `localhost`. Otherwise you get in-page messages only.
- **Banner says "offline"**: the control sites didn't answer either, so the check wasn't recorded. Check your connection or any ad or privacy blocker.
- **Unexpected "outage" while the Archive seems fine**: look at the card's second-opinion line. If the collector can reach it, the problem is likely your route or a browser extension.
