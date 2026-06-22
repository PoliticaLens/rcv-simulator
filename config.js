// config.js — manages the candidate config panel

const Config = (() => {
  let state = {
    candidates: JSON.parse(JSON.stringify(DEFAULT_CANDIDATES)),
    voterCount: 10000,
    turnoutVar: 'low',
    electionType: 'general',
    customParty: 'Independent Party',
    extraPool: JSON.parse(JSON.stringify(EXTRA_CANDIDATE_POOL)),
  };

  function getPartyLabel() {
    return {
      'general': null, // each candidate has their own party
      'primary-dem': 'Democratic Party',
      'primary-rep': 'Republican Party',
      'primary-custom': state.customParty || 'Primary',
    }[state.electionType];
  }

  function getElectionType() { return state.electionType; }

  function getCandidates() {
    const partyLabel = getPartyLabel();
    if (partyLabel === null) return state.candidates;
    // In primary mode, override each candidate's party with the shared label
    return state.candidates.map(c => ({ ...c, party: partyLabel }));
  }
  function getVoterCount() { return state.voterCount; }
  function getTurnoutVar() { return state.turnoutVar; }

  function render() {
    const grid = document.getElementById('candidates-grid');
    if (!grid) return;
    grid.innerHTML = '';
    document.getElementById('candidate-count').textContent = state.candidates.length;

    state.candidates.forEach((c, i) => {
      const col = getColor(i);
      const card = document.createElement('div');
      card.className = 'candidate-card';
      card.dataset.id = c.id;

      const partyLabel = getPartyLabel();
      const partyVal = partyLabel !== null ? partyLabel : c.party;
      const partyReadonly = partyLabel !== null;

      card.innerHTML = `
        <div class="card-top">
          <div class="candidate-avatar" style="background:${col.color}">
            ${getCandidateEmoji(c.name)}
          </div>
          <div class="card-name-wrap">
            <input class="card-name-input" value="${escHtml(c.name)}"
              oninput="Config._updateField(${c.id}, 'name', this.value)"
              placeholder="Candidate name" />
            <input class="card-party-input" value="${escHtml(partyVal)}"
              oninput="Config._updateField(${c.id}, 'party', this.value)"
              placeholder="Party / affiliation"
              ${partyReadonly ? 'readonly style="opacity:.5;cursor:default"' : ''} />
          </div>
          ${state.candidates.length > 2 ? `<button class="remove-btn" onclick="Config._removeById(${c.id})" title="Remove candidate">✕</button>` : ''}
        </div>

        ${renderStat(c.id, i, 'polling', c.polling, 'Polling average', '%', col.color)}
        ${renderStat(c.id, i, 'enthusiasm', c.enthusiasm, 'Voter enthusiasm', '', col.color)}
        ${renderStat(c.id, i, 'crossover', c.crossover, 'Crossover appeal', '', col.color)}
      `;
      grid.appendChild(card);
    });
  }

  function renderStat(cid, idx, field, val, label, suffix, color) {
    const pct = field === 'polling' ? val : val;
    const tipText = {
      polling: 'What share of first-choice votes this candidate is polling at. The simulator normalizes these to sum to 100%.',
      enthusiasm: 'How reliably supporters actually turn out. High enthusiasm = voters are more likely to show up.',
      crossover: 'How often supporters of other candidates rank this one 2nd or 3rd. Affects vote transfer patterns.',
    }[field];
    return `
      <div class="card-stat" title="${tipText}">
        <label>
          <span>${label}</span>
          <span class="stat-val" id="val-${cid}-${field}">${val}${suffix}</span>
        </label>
        <div class="stat-bar-wrap">
          <div class="stat-bar" id="bar-${cid}-${field}" style="width:${pct}%;background:${color}"></div>
        </div>
        <input type="range" min="${field === 'polling' ? 1 : 10}" max="100" value="${val}"
          oninput="Config._updateStat(${cid}, '${field}', this.value, '${suffix}')"
          style="width:100%;margin-top:6px;accent-color:${color}">
      </div>
    `;
  }

  function _updateField(id, field, val) {
    const c = state.candidates.find(x => x.id === id);
    if (c) {
      c[field] = val;
      // Re-render avatar initials if name changed
      if (field === 'name') {
        const i = state.candidates.indexOf(c);
        const col = getColor(i);
        const avatar = document.querySelector(`[data-id="${id}"] .candidate-avatar`);
        if (avatar) avatar.textContent = getCandidateEmoji(val);
      }
    }
  }

  function _updateStat(id, field, val, suffix) {
    const c = state.candidates.find(x => x.id === id);
    if (!c) return;
    c[field] = parseInt(val);
    const valEl = document.getElementById(`val-${id}-${field}`);
    const barEl = document.getElementById(`bar-${id}-${field}`);
    if (valEl) valEl.textContent = val + suffix;
    if (barEl) barEl.style.width = val + '%';
  }

  function _removeById(id) {
    state.candidates = state.candidates.filter(c => c.id !== id);
    render();
  }

  function addCandidate() {
    if (state.candidates.length >= 6) return;
    let template = state.extraPool.find(p => !state.candidates.some(c => c.name === p.name));
    if (!template) template = { name: 'New Candidate', party: 'Independent', polling: 10, enthusiasm: 60, crossover: 40 };
    const newC = { ...JSON.parse(JSON.stringify(template)), id: Date.now() };
    state.candidates.push(newC);
    render();
  }

  function removeCandidate() {
    if (state.candidates.length <= 2) return;
    state.candidates.pop();
    render();
  }

  function updateVoterCount(val) {
    state.voterCount = parseInt(val);
    document.getElementById('voter-count-display').textContent = parseInt(val).toLocaleString();
  }

  function setTurnoutVar(btn) {
    document.querySelectorAll('.toggle-group .toggle').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.turnoutVar = btn.dataset.val;
  }

  function randomize() {
    state.candidates = state.candidates.map(c => ({
      ...c,
      polling: randInt(5, 45),
      enthusiasm: randInt(30, 95),
      crossover: randInt(10, 75),
    }));
    // Normalize polling so it's intuitive
    render();
  }

  function setElectionType(btn) {
    document.querySelectorAll('[onclick*="setElectionType"] .toggle, .toggle[onclick*="setElectionType"]').forEach(b => b.classList.remove('active'));
    // target all election type toggles
    document.querySelectorAll('.toggle[data-val]').forEach(b => {
      if (['general','primary-dem','primary-rep','primary-custom'].includes(b.dataset.val)) {
        b.classList.remove('active');
      }
    });
    btn.classList.add('active');
    state.electionType = btn.dataset.val;
    const customRow = document.getElementById('custom-party-row');
    if (customRow) customRow.style.display = state.electionType === 'primary-custom' ? 'flex' : 'none';
    render();
  }

  function setCustomParty(val) {
    state.customParty = val || 'Primary';
    render();
  }

  function init() {
    render();
  }

  return {
    init, render, getCandidates, getVoterCount, getTurnoutVar, getElectionType,
    addCandidate, removeCandidate, updateVoterCount, setTurnoutVar,
    setElectionType, setCustomParty,
    randomize, _updateField, _updateStat, _removeById,
  };
})();

// ── Helpers ──
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randFloat(min, max) {
  return Math.random() * (max - min) + min;
}
