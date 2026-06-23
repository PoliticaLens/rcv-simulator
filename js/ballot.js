// ballot.js — ballot generation (simulation) and voter-mode UI

// ── Voter mode UI ──
const Voter = (() => {
  let voterRanking = []; // candidate objects in ranked order

  function init(candidates) {
    voterRanking = [...candidates]; // start in default order, user rearranges
    renderBallot();
  }

  function renderBallot() {
    const list = document.getElementById('ballot-list');
    if (!list) return;
    list.innerHTML = '';

    voterRanking.forEach((c, i) => {
      const col = getColor(i);
      const li = document.createElement('li');
      li.className = 'ballot-item';
      li.draggable = true;
      li.dataset.idx = i;

      li.innerHTML = `
        <div class="ballot-rank" style="background:${col.color}">${i + 1}</div>
        <span class="ballot-name">${escHtml(c.name)}</span>
        <span style="font-size:.75rem;color:var(--ink-faint)">${escHtml(c.party)}</span>
        <div class="ballot-move">
          <button onclick="Voter._moveUp(${i})" ${i === 0 ? 'disabled' : ''}>▲</button>
          <button onclick="Voter._moveDown(${i})" ${i === voterRanking.length - 1 ? 'disabled' : ''}>▼</button>
        </div>
      `;

      // Drag events
      li.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', i);
        li.classList.add('dragging');
      });
      li.addEventListener('dragend', () => li.classList.remove('dragging'));
      li.addEventListener('dragover', e => { e.preventDefault(); li.classList.add('drag-over'); });
      li.addEventListener('dragleave', () => li.classList.remove('drag-over'));
      li.addEventListener('drop', e => {
        e.preventDefault();
        li.classList.remove('drag-over');
        const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
        const toIdx = i;
        if (fromIdx !== toIdx) _swap(fromIdx, toIdx);
      });

      list.appendChild(li);
    });
  }

  function _moveUp(idx) {
    if (idx === 0) return;
    [voterRanking[idx], voterRanking[idx - 1]] = [voterRanking[idx - 1], voterRanking[idx]];
    renderBallot();
  }

  function _moveDown(idx) {
    if (idx >= voterRanking.length - 1) return;
    [voterRanking[idx], voterRanking[idx + 1]] = [voterRanking[idx + 1], voterRanking[idx]];
    renderBallot();
  }

  function _swap(from, to) {
    const temp = voterRanking[from];
    voterRanking[from] = voterRanking[to];
    voterRanking[to] = temp;
    renderBallot();
  }

  function getRanking() { return voterRanking; }

  function submitBallot() {
    const ranking = getRanking();
    // Run simulation — the voter's ballot is folded in as one of the ballots
    Simulator.runSimulation({ voterBallot: ranking });
  }

  return { init, renderBallot, getRanking, submitBallot, _moveUp, _moveDown };
})();


// ── Ballot generation (the simulation engine's ballot layer) ──
const BallotGen = (() => {

  /**
   * Generate a full set of ranked ballots for all voters.
   *
   * Model:
   *  1. Each candidate has a polling share (normalized to 1.0).
   *  2. Enthusiasm affects actual turnout — draw from a Dirichlet-like
   *     model where each candidate's effective share = polling * turnout_modifier.
   *  3. For each "voter", we pick their 1st choice proportionally to
   *     effective shares, then fill remaining ranks using crossover appeal
   *     (how likely supporters of OTHER candidates rank this one next).
   */
  function generate(candidates, totalVoters, turnoutVar, voterBallot = null) {
    const candidates_copy = candidates.map((c, i) => ({ ...c, colorIdx: i }));

    // Normalize polling
    const totalPoll = candidates_copy.reduce((s, c) => s + c.polling, 0);
    const normPoll = candidates_copy.map(c => c.polling / totalPoll);

    // Apply enthusiasm modifier
    const variance = { low: 0.05, medium: 0.15, high: 0.3 }[turnoutVar] || 0.1;
    const effectiveShare = candidates_copy.map((c, i) => {
      const enthMod = 0.7 + (c.enthusiasm / 100) * 0.6; // 0.7 – 1.3
      const noise = 1 + (Math.random() - 0.5) * 2 * variance;
      return normPoll[i] * enthMod * noise;
    });

    // Re-normalize after modifiers
    const totalEff = effectiveShare.reduce((s, v) => s + v, 0);
    const finalShare = effectiveShare.map(v => v / totalEff);

    // Build cumulative distribution for first-choice sampling
    const cdf = buildCDF(finalShare);

    // Generate ballots
    const ballots = [];
    const startIdx = voterBallot ? 1 : 0; // reserve slot 0 for voter ballot

    for (let v = startIdx; v < totalVoters; v++) {
      const ballot = generateSingleBallot(candidates_copy, cdf, finalShare);
      ballots.push(ballot);
    }

    // Inject the player's ballot at position 0 if provided
    if (voterBallot) {
      // voterBallot is an array of candidate objects in ranked order
      const voterBallotIds = voterBallot.map(c => c.id);
      ballots.unshift(voterBallotIds);
    }

    return { ballots, candidates: candidates_copy, finalShare };
  }

  function generateSingleBallot(candidates, cdf, finalShare) {
    const n = candidates.length;
    const remaining = [...candidates];
    const ballot = [];

    // Pick first choice from CDF
    const r = Math.random();
    let firstChoiceIdx = cdf.findIndex(v => r <= v);
    if (firstChoiceIdx < 0) firstChoiceIdx = n - 1;

    const firstChoice = candidates[firstChoiceIdx];
    ballot.push(firstChoice.id);
    remaining.splice(remaining.findIndex(c => c.id === firstChoice.id), 1);

    // Fill remaining ranks using crossover weights
    while (remaining.length > 0) {
      // Weight = crossover appeal of each remaining candidate
      // + small randomness so ballots aren't identical
      const weights = remaining.map(c => {
        const baseW = c.crossover / 100;
        const noise = Math.random() * 0.3;
        return Math.max(0.01, baseW + noise);
      });
      const totalW = weights.reduce((s, w) => s + w, 0);
      const normW = weights.map(w => w / totalW);
      const nextCDF = buildCDF(normW);

      const r2 = Math.random();
      let nextIdx = nextCDF.findIndex(v => r2 <= v);
      if (nextIdx < 0) nextIdx = remaining.length - 1;

      ballot.push(remaining[nextIdx].id);
      remaining.splice(nextIdx, 1);
    }

    return ballot;
  }

  function buildCDF(probs) {
    const cdf = [];
    let sum = 0;
    for (const p of probs) {
      sum += p;
      cdf.push(sum);
    }
    cdf[cdf.length - 1] = 1.0; // ensure last is exactly 1
    return cdf;
  }

  return { generate };
})();
