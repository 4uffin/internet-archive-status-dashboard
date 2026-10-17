# IA status collector

Probes the Internet Archive endpoints every ~5 minutes from GitHub Actions and publishes
`data.json` on a `data` branch. The dashboard reads it to get 24/7 uptime history and to build the Archive Tides profile.

## Setup
1. Create a **public** GitHub repo and add `collect.mjs` and `.github/workflows/collect.yml` to the default branch.
2. Repo Settings → Actions → General: allow workflows, and give the workflow token read and write permission.
3. Actions → "collect" → Run workflow once. This creates the `data` branch.
4. In the dashboard, paste `https://raw.githubusercontent.com/<you>/<repo>/data/data.json` into "Shared collector" and press Load.

## Notes
- Data is kept for 21 days in 10-minute buckets. Each run force-pushes one commit, so the repo doesn't grow.
- Scheduled runs are best-effort (often a few minutes late), and GitHub may pause schedules on inactive repos; re-enable them from the Actions tab if that happens.
- Probes run from GitHub's datacenters, so absolute latencies differ from what you see. The dashboard only uses *ratios* to each endpoint's own median for the tide, so that's fine.
- The tide profile needs roughly a week of data before it takes over from the traffic model.
