# Valley Rise

A **2.5D pixel open-world RPG** about surviving Silicon Valley as a new grad.

Inspired by [北京浮生记](https://github.com/chrisguo/beijing_fushengji).

## Play

```bash
npm install
npm run dev
```

## Controls

| Key | Action |
|-----|--------|
| **WASD / Arrows** | Walk the peninsula |
| **E / Enter** | Enter a building or talk to someone |
| Click UI | Choose weekly actions inside menus |

## Loop

- Specs: **Money**, **Reputation**, **Health**
- Explore freely; each meaningful action advances **one week**
- Random events fire (career, markets, relationships, chaos)
- Health &lt; 50% → you must reach the **Hospital**
- Last **104 weeks** and chase glory titles

## World

- Open map: campus, exchange, bank, clinic, realty, bay shoreline
- People: Girlfriend / Wife, Colleague, Boss, Friend (affinity system)
- Robinhood-style stock UI with charts & unrealized P&amp;L
- Weather-tinted skies from live Mountain View conditions

## Stack

Vite · React · TypeScript · Canvas pixel renderer · Zustand
