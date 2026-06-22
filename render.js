// render.js — results rendering with round-by-round explanations

const Renderer = (() => {

  function showResults({ rounds, candidates, finalShare, voterBallot }) {
    // Switch to results panel
    App.showPanel('results');

    const container = document.getElementById('rounds-container');
    container.innerHTML = '';

    const title = document.getElementById('results-title');
    const subtitle = document.getElementById('results-subtitle');
    const electionType = Config.getElectionType();
    const electionLabel = {
      'general': 'General Election',
      'primary-dem': 'Democratic Primary',
      'primary-rep': 'Republican Primary',
      'primary-custom': Config.getCandidates()[0]?.party || 'Primary',
    }[electionType] || 'Election';

    title.textContent = rounds.length === 1 && rounds[0].winner !== null
      ? 'Winner on first count!'
      : `Results — ${rounds.length} round${rounds.length > 1 ? 's' : ''}`;
    subtitle.textContent = `${electionLabel} · ${rounds[rounds.length - 1].totalVotes.toLocaleString()} votes cast across ${candidates.length} candidates.`;

    // Voter ballot summary
    const voterSummaryEl = document.getElementById('voter-ballot-summary');
    const voterDisplayEl = document.getElementById('voter-ballot-display');
    if (voterBallot && voterBallot.length > 0) {
      voterSummaryEl.style.display = 'block';
      voterDisplayEl.innerHTML = '';
      const rankRow = document.createElement('div');
      rankRow.className = 'voter-ranking';
      voterBallot.forEach((c, i) => {
        const col = getColor(candidates.findIndex(x => x.id === c.id));
        const item = document.createElement('div');
        item.className = 'voter-rank-item';
        item.innerHTML = `
          <span class="vr-num">${i + 1}</span>
          <span class="cand-dot" style="background:${col.color}"></span>
          <span>${escHtml(c.name)}</span>
        `;
        rankRow.appendChild(item);
      });
      voterDisplayEl.appendChild(rankRow);
    } else {
      voterSummaryEl.style.display = 'none';
    }

    // Build previous-round vote map for transfer display
    let prevCounts = null;

    rounds.forEach((round, rIdx) => {
      const block = document.createElement('div');
      block.className = 'round-block';
      block.style.animationDelay = `${rIdx * 80}ms`;

      const isLast = rIdx === rounds.length - 1;
      const isFirstRound = rIdx === 0;

      const explanation = buildExplanation(round, rIdx, rounds, candidates, prevCounts);

      // Sort candidates for display: active first (by votes desc), then eliminated
      const sortedActive = [...round.active].sort((a, b) => round.counts[b] - round.counts[a]);
      const allDisplayIds = [...sortedActive,
        ...Object.keys(round.counts).filter(id => !round.active.includes(parseInt(id))).map(Number)
      ];

      block.innerHTML = `
        <div class="round-header">
          <div>
            <div class="round-label">Round ${round.roundNum}</div>
            <div class="round-title">${roundTitle(round, rIdx, rounds.length)}</div>
            <div class="round-total">${round.totalVotes.toLocaleString()} active votes · majority threshold: ${Math.ceil(round.majority).toLocaleString()}</div>
          </div>
          <div class="round-explanation">
            <p>${explanation}</p>
          </div>
        </div>

        <div class="candidates-bars">
          ${buildBarsHTML(round, candidates, allDisplayIds, prevCounts)}
        </div>

        ${round.eliminated ? buildEliminationNotice(round.eliminated, candidates, round) : ''}
        ${(isLast && round.winner) ? buildWinnerBanner(round.winner, round, candidates) : ''}
      `;

      container.appendChild(block);
      prevCounts = { ...round.counts };
    });

    // Scroll to results
    document.getElementById('panel-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function roundTitle(round, idx, total) {
    if (round.winner) {
      return idx === 0 ? 'First-choice majority' : 'Final count — winner declared';
    }
    return idx === 0 ? 'First-choice tally' : 'After redistribution';
  }

  function buildExplanation(round, idx, rounds, candidates, prevCounts) {
    if (idx === 0) {
      const leader = [...round.active].sort((a, b) => round.counts[b] - round.counts[a])[0];
      const leaderC = candidates.find(c => c.id === leader);
      const leaderPct = pct(round.counts[leader], round.totalVotes);
      if (round.winner) {
        return `Every ballot was counted for each voter's first-choice candidate. <strong>${escHtml(leaderC?.name)}</strong> led with <strong>${leaderPct}%</strong> — more than 50% of all votes — so they win outright without needing additional rounds.`;
      }
      const eliminated = round.eliminated;
      const elimC = candidates.find(c => c.id === eliminated);
      return `Every ballot was counted for each voter's first-choice candidate. No one reached 50%, so the race continues. <strong>${escHtml(elimC?.name)}</strong> received the fewest votes (${pct(round.counts[eliminated], round.totalVotes)}%) and will be eliminated.`;
    }

    if (round.winner) {
      const winnerC = candidates.find(c => c.id === round.winner);
      const winPct = pct(round.counts[round.winner], round.totalVotes);
      return `After redistributing votes from eliminated candidates, <strong>${escHtml(winnerC?.name)}</strong> has crossed the 50% threshold with <strong>${winPct}%</strong>. Every voter still has their vote counted — it's just been transferred down their preference list.`;
    }

    const prevElim = rounds[idx - 1].eliminated;
    const prevElimC = candidates.find(c => c.id === prevElim);
    const eliminated = round.eliminated;
    const elimC = candidates.find(c => c.id === eliminated);
    const transferCount = prevCounts ? prevCounts[prevElim] : '?';

    return `The ${Number(transferCount).toLocaleString()} votes that went to <strong>${escHtml(prevElimC?.name)}</strong> have been transferred to those voters' next-ranked active candidate. Still no majority, so <strong>${escHtml(elimC?.name)}</strong> (last place) is now eliminated.`;
  }

  function buildBarsHTML(round, candidates, displayIds, prevCounts) {
    return displayIds.map(id => {
      const c = candidates.find(x => x.id === id);
      if (!c) return '';
      const cIdx = candidates.indexOf(c);
      const col = getColor(cIdx);
      const votes = round.counts[id] || 0;
      const isActive = round.active.includes(id);
      const isWinner = round.winner === id;
      const fillPct = Math.max(0, Math.min(100, (votes / round.totalVotes) * 100));
      const votePct = pct(votes, round.totalVotes);

      let transferHTML = '';
      if (prevCounts && prevCounts[id] !== undefined) {
        const diff = votes - (prevCounts[id] || 0);
        if (diff > 0) transferHTML = `<span class="transfer-pos">+${diff.toLocaleString()}</span>`;
        else if (diff < 0) transferHTML = `<span class="transfer-neg">${diff.toLocaleString()}</span>`;
      }

      const pctNum = parseFloat(votePct);
      const pctInBar = pctNum > 12;

      return `
        <div class="cand-row ${!isActive ? 'cand-eliminated' : ''}">
          <div class="cand-name-cell">
            <span class="cand-dot" style="background:${isActive ? col.color : '#ccc'}"></span>
            <span class="cand-name-text">${escHtml(c.name)}
              ${isWinner ? '<span class="majority-badge">✓ Winner</span>' : ''}
            </span>
          </div>
          <div class="bar-cell">
            <div class="bar-majority"></div>
            <div class="bar-fill" style="width:${fillPct}%;background:${isActive ? col.color : '#ccc'}">
              ${pctInBar ? `<span class="bar-pct">${votePct}%</span>` : ''}
            </div>
            ${!pctInBar ? `<span class="bar-pct outside">${votePct}%</span>` : ''}
          </div>
          <div class="votes-cell">${votes.toLocaleString()}</div>
          <div class="transfer-cell">${transferHTML}</div>
        </div>
      `;
    }).join('');
  }

  function buildEliminationNotice(elimId, candidates, round) {
    const c = candidates.find(x => x.id === elimId);
    if (!c) return '';
    const votes = round.counts[elimId] || 0;
    const votePct = pct(votes, round.totalVotes);
    return `
      <div class="elimination-notice">
        <div class="elim-icon">✕</div>
        <div class="elim-text">
          <p><span class="elim-name">${escHtml(c.name)}</span> is eliminated with ${votes.toLocaleString()} votes (${votePct}% of ballots). Their supporters' votes will be transferred to whoever they ranked next on their ballot.</p>
        </div>
      </div>
    `;
  }

  function buildWinnerBanner(winnerId, round, candidates) {
    const c = candidates.find(x => x.id === winnerId);
    if (!c) return '';
    const votes = round.counts[winnerId];
    const winPct = pct(votes, round.totalVotes);
    const col = getColor(candidates.indexOf(c));
    return `
      <div class="winner-banner">
        <div class="winner-trophy">🏆</div>
        <div class="winner-label">Winner</div>
        <div class="winner-name" style="color:${col.color}">${escHtml(c.name)}</div>
        <div class="winner-pct">${winPct}% — ${votes.toLocaleString()} votes</div>
        <div class="winner-detail">${escHtml(c.party)} · Round ${round.roundNum} · ${round.totalVotes.toLocaleString()} total ballots</div>
      </div>
    `;
  }

  function pct(num, total) {
    if (!total) return '0.0';
    return ((num / total) * 100).toFixed(1);
  }

  return { showResults };
})();
