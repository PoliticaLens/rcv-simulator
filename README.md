# RCV Simulator 🗳️

An interactive, browser-based simulator for **Ranked Choice Voting** (also called Instant-Runoff Voting). Watch elimination rounds unfold step-by-step, with plain-English explanations of exactly what's happening at each stage.

**[Live Demo →](https://YOUR_USERNAME.github.io/rcv-simulator)**

---

## What it does

### Two modes

**Configure & Simulate**
Set up a custom race:
- Add/remove candidates (2–6)
- Adjust each candidate's polling average, voter enthusiasm, and crossover appeal
- Set total voter count (500–50,000)
- Choose turnout variability (how much actual results can deviate from polling)
- Run the simulation to see round-by-round results

**Vote as a Citizen**
Go in blind:
- Rank candidates in order of preference without seeing any polling data
- Submit your ballot
- Watch the results — including which round your vote affected

---

## How the simulation works

### Ballot generation model

1. **Polling → first-choice probability.** Each candidate's polling share is normalized to sum to 100%.

2. **Enthusiasm modifier.** Each candidate's effective share is multiplied by a modifier derived from their enthusiasm score (0.7–1.3×) plus configurable noise based on turnout variability.

3. **Crossover appeal → transfer weights.** When a voter's top candidate is eliminated, their next-choice vote is distributed among remaining candidates weighted by those candidates' crossover appeal scores — representing how broadly appealing a candidate is beyond their core base.

### RCV tabulation (standard instant-runoff)

1. Count all first-choice votes.
2. If any candidate has >50%, they win.
3. Otherwise, eliminate the last-place candidate.
4. Transfer their supporters' votes to the next active candidate on each ballot.
5. Repeat until someone has a majority.

---

## Running locally

No build step. Just open `index.html` in a browser:

```bash
git clone https://github.com/YOUR_USERNAME/rcv-simulator.git
cd rcv-simulator
open index.html          # macOS
# or: xdg-open index.html  (Linux)
# or: start index.html     (Windows)
```

Or serve it with any static file server:

```bash
npx serve .
# or
python3 -m http.server 8000
```

---

## Project structure

```
rcv-simulator/
├── index.html          # Main page, all markup
├── css/
│   └── style.css       # All styles
├── js/
│   ├── candidates.js   # Default candidate data & color system
│   ├── config.js       # Configure-mode panel logic
│   ├── ballot.js       # Ballot generation model + voter-mode UI
│   ├── simulator.js    # Core RCV tabulation engine
│   ├── render.js       # Results rendering with explanations
│   └── app.js          # App controller (mode switching)
└── README.md
```

---

## Deploying to GitHub Pages

1. Push to GitHub
2. Go to **Settings → Pages**
3. Set source to `main` branch, `/ (root)`
4. Your site will be at `https://YOUR_USERNAME.github.io/rcv-simulator`

---

## Customizing candidates

Edit `js/candidates.js` to change the default candidates or expand the pool:

```js
const DEFAULT_CANDIDATES = [
  {
    id: 0,
    name: 'Your Candidate',
    party: 'Your Party',
    polling: 34,       // Starting poll share (normalized automatically)
    enthusiasm: 70,    // 0–100: how reliably supporters turn out
    crossover: 20,     // 0–100: how often other voters rank them 2nd/3rd
  },
  // ...
];
```

---

## Ideas for contribution

- [ ] Export results as shareable URL (encode config in query params)
- [ ] Side-by-side comparison: RCV vs first-past-the-post outcome
- [ ] Support for multi-winner STV (Single Transferable Vote)
- [ ] Animated vote transfer visualization
- [ ] CSV ballot import for real election data
- [ ] Accessibility audit (keyboard nav, screen reader labels)

---

## License

MIT — do whatever you like with it. If you use it for civic education or journalism, a mention would be appreciated.

---

*Simulated ballots use a probabilistic model — results vary each run. Not affiliated with any election authority or campaign.*
