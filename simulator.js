// simulator.js — core RCV tabulation engine

const Simulator = (() => {

  let lastSimResult = null;

  /**
   * Run the full simulation.
   * @param {object} opts - { voterBallot: [...] } for voter mode
   */
  function runSimulation(opts = {}) {
    const candidates = Config.getCandidates();
    const voterCount = Config.getVoterCount();
    const turnoutVar = Config.getTurnoutVar();

    if (candidates.length < 2) {
      alert('Please add at least 2 candidates.');
      return;
    }

    const { ballots, candidates: cands, finalShare } = BallotGen.generate(
      candidates, voterCount, turnoutVar, opts.voterBallot || null
    );

    // Run RCV rounds
    const rounds = tabulate(ballots, cands.map(c => c.id));

    lastSimResult = { rounds, candidates: cands, finalShare, voterBallot: opts.voterBallot || null };

    Renderer.showResults(lastSimResult);
  }

  /**
   * Tabulate ballots through rounds until a candidate has >50%.
   * Returns array of round objects.
   */
  function tabulate(ballots, candidateIds) {
    const rounds = [];
    let active = [...candidateIds];
    // Track vote counts per round for each candidate
    let currentBallots = ballots.map(b => [...b]);

    while (active.length > 1) {
      const roundNum = rounds.length + 1;

      // Count first-choice votes among active candidates
      const counts = {};
      active.forEach(id => counts[id] = 0);

      currentBallots.forEach(ballot => {
        // Find the first active candidate on this ballot
        const choice = ballot.find(id => active.includes(id));
        if (choice !== undefined) counts[choice]++;
      });

      const totalVotes = Object.values(counts).reduce((s, v) => s + v, 0);
      const majority = totalVotes / 2;

      // Check for winner
      const sortedIds = [...active].sort((a, b) => counts[b] - counts[a]);
      const leader = sortedIds[0];
      const leaderVotes = counts[leader];

      rounds.push({
        roundNum,
        counts: { ...counts },
        totalVotes,
        active: [...active],
        eliminated: null,
        winner: leaderVotes > majority ? leader : null,
        majority,
      });

      if (leaderVotes > majority) break;

      // Eliminate last-place candidate
      const lastPlace = sortedIds[sortedIds.length - 1];
      rounds[rounds.length - 1].eliminated = lastPlace;

      active = active.filter(id => id !== lastPlace);
    }

    // If only one candidate remains and no winner yet
    if (active.length === 1) {
      const lastRound = rounds[rounds.length - 1];
      if (!lastRound.winner) {
        lastRound.winner = active[0];
      }
    }

    return rounds;
  }

  return { runSimulation };
})();
