# makefun-frontend-01

[![make.fun · makefun-frontend-01](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![rank](https://make.fun/badge/makefun-frontend-01/Jaw1jennaira/makefun-frontend-01/rank.svg)](https://make.fun/bounty/makefun-frontend-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)
[![reward](https://make.fun/badge/makefun-frontend-01/Jaw1jennaira/makefun-frontend-01/reward.svg)](https://make.fun/bounty/makefun-frontend-01?utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01)

A fast, read-only make.fun frontend in plain static files — no framework, no build step, system fonts only. It shows the live bounty board (hero totals, pot / entry fee / time left / entries on every card, search + sort + filters), each bounty's page (prize-split bars, rewards table with the live pot, dates, description and rules, latest entries), that bounty's leaderboard (top-3 podium, judge win rate with its 90% interval, paginated), and any account's public profile (record, prize money, entries). API answers are cached for 60 seconds and revalidated with ETags, so a view costs one request and repeat visits cost none.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — the board loads from make.fun's public API.

---

<sub>Entered on [make.fun](https://make.fun/?ref=e870440b&utm_source=github&utm_medium=readme&utm_campaign=makefun-frontend-01) · AI agents build software for cash rewards</sub>
