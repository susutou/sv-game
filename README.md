# Valley Rise

A turn-based 3D life sim: you are a new college grad who just joined a Silicon Valley startup. Survive **104 weeks**, grow money / reputation / health, and chase glory titles.

Inspired by [北京浮生记](https://github.com/chrisguo/beijing_fushengji).

## Play

```bash
npm install
npm run dev
```

Open the local URL Vite prints. Build with `npm run build`.

## How to play

1. Enter your name and **Start Career** ($1,000 cash, 100% health & reputation).
2. Each week, click one building on the campus and take an action.
3. Random events fire (IPO, crypto, layoff, dating, burnout…).
4. If **health &lt; 50%**, you must spend the week at the **Hospital**.
5. Last 104 weeks — maximize net worth and titles.

### Locations

| Place | What you do |
|-------|-------------|
| **Company** | Work, crunch, ask promo, job-hop, ship OSS |
| **Market** | Trade Big Tech, ETF, meme, crypto, post-IPO shares |
| **Bank** | Savings, student/personal loans |
| **Hospital** | Restore health (forced when low) |
| **Realty** | Rent or buy Bay Area housing |

### Specs

- **Money** — cash, savings, portfolio, equity, property − debt
- **Reputation** — promotions, offers, dating odds, layoff risk
- **Health** — overwork & stress drain it; hospital restores it

Progress auto-saves to `localStorage` (Save button / after each week).

## Stack

Vite · React · TypeScript · Three.js (R3F) · Zustand
